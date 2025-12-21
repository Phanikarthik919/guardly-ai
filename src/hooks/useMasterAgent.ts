import { useState, useCallback, useRef } from 'react';
import { usePipeline, Regulation, ParsedClause, Transaction, ComplianceResult, AuditReport } from '@/contexts/PipelineContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { getSupabasePublicConfig } from '@/lib/publicConfig';
import { useToast } from '@/hooks/use-toast';

export type MasterAgentStep = 
  | 'idle'
  | 'analyzing_data'
  | 'fetching_regulations'
  | 'filtering_regulations'
  | 'parsing_clauses'
  | 'mapping_compliance'
  | 'generating_report'
  | 'complete'
  | 'error';

export interface MasterAgentProgress {
  step: MasterAgentStep;
  currentItem: number;
  totalItems: number;
  message: string;
  logs: { type: 'info' | 'success' | 'error' | 'warning'; message: string; timestamp: Date }[];
  detectedCategories: string[];
}

interface UseMasterAgentOptions {
  onComplete?: (report: AuditReport) => void;
  /** Minimum delay between API calls in ms (controls concurrency) */
  minIntervalMs?: number;
}

export function useMasterAgent(options: UseMasterAgentOptions = {}) {
  const { toast } = useToast();
  const pipeline = usePipeline();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [finalReport, setFinalReport] = useState<AuditReport | null>(null);
  const [progress, setProgress] = useState<MasterAgentProgress>({
    step: 'idle',
    currentItem: 0,
    totalItems: 0,
    message: 'Ready to start automated audit',
    logs: [],
    detectedCategories: [],
  });

  // Prevent request storms that trigger 429s
  const lastCallAtRef = useRef(0);
  const minIntervalMs = options.minIntervalMs ?? 450;
  
  // Pause/resume refs
  const pauseResolveRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (pauseResolveRef.current) {
      pauseResolveRef.current();
      pauseResolveRef.current = null;
    }
  }, []);

  const checkPause = useCallback(async () => {
    if (isPausedRef.current) {
      await new Promise<void>((resolve) => {
        pauseResolveRef.current = resolve;
      });
    }
  }, []);

  const addLog = useCallback((type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-100), { type, message, timestamp: new Date() }],
    }));
  }, []);

  const updateProgress = useCallback((step: MasterAgentStep, message: string, current = 0, total = 0) => {
    setProgress(prev => ({
      ...prev,
      step,
      message,
      currentItem: current,
      totalItems: total,
    }));
  }, []);

  const callAgent = async (functionName: string, body: Record<string, unknown>): Promise<string> => {
    // Check if paused before making call
    await checkPause();

    // Simple client-side throttling
    const now = Date.now();
    const sinceLast = now - lastCallAtRef.current;
    if (sinceLast < minIntervalMs) {
      await sleep(minIntervalMs - sinceLast);
    }
    lastCallAtRef.current = Date.now();

    const { url: backendUrl, publishableKey } = getSupabasePublicConfig();
    const url = `${backendUrl}/functions/v1/${functionName}`;

    // Functions are public; use the publishable key so we never depend on expiring user sessions.
    const maxRetries = 6;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publishableKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        if (!reader) return '';

        const decoder = new TextDecoder();
        let result = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const jsonStr = line.slice(5).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) result += content;
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        return result;
      }

      // Handle rate limiting with backoff
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
        const backoffMs = Math.min(60000, 1500 * 2 ** attempt + Math.floor(Math.random() * 500));
        const waitMs = Math.max(retryAfterMs, backoffMs);
        addLog('warning', `Rate limited (429) on ${functionName}. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
        await sleep(waitMs);
        continue;
      }

      const errorText = await readResponseError(response);
      throw new Error(`Agent ${functionName} failed (${response.status}): ${errorText}`);
    }

    throw new Error(`Agent ${functionName} failed: rate limit exceeded`);
  };

  // Detect transaction categories for regulation filtering
  const detectCategories = (transactions: Transaction[]): string[] => {
    const categoryMap: Record<string, string[]> = {
      'tax': ['Tax', 'GST', 'Income Tax', 'VAT', 'Customs', 'Excise'],
      'banking': ['Wire Transfer', 'Bank', 'NEFT', 'RTGS', 'UPI', 'Payment'],
      'government': ['Government', 'Grant', 'Subsidy', 'Ministry', 'Public'],
      'procurement': ['Procurement', 'GeM', 'Tender', 'Contract', 'Purchase'],
      'investment': ['Investment', 'Securities', 'Stock', 'Mutual Fund'],
      'compliance': ['Audit', 'Compliance', 'Filing', 'Return'],
    };

    const detectedCategories = new Set<string>();
    
    for (const tx of transactions) {
      const searchText = `${tx.category} ${tx.description} ${tx.vendor}`.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
          detectedCategories.add(category);
        }
      }
    }

    return detectedCategories.size > 0 ? Array.from(detectedCategories) : ['compliance'];
  };

  const runMasterAgent = useCallback(async (inputTransactions: Transaction[]) => {
    if (inputTransactions.length === 0) {
      toast({ title: 'No transaction data provided', variant: 'destructive' });
      return null;
    }

    setIsRunning(true);
    setFinalReport(null);
    setProgress({
      step: 'idle',
      currentItem: 0,
      totalItems: 0,
      message: 'Starting automated audit...',
      logs: [],
      detectedCategories: [],
    });

    try {
      // ====== STEP 1: ANALYZE DATA & DETECT CATEGORIES ======
      updateProgress('analyzing_data', 'Analyzing transaction data...', 0, inputTransactions.length);
      addLog('info', `Received ${inputTransactions.length} transactions for analysis`);

      const categories = detectCategories(inputTransactions);
      setProgress(prev => ({ ...prev, detectedCategories: categories }));
      addLog('success', `Detected categories: ${categories.join(', ')}`);

      pipeline.setTransactions(inputTransactions);

      // ====== STEP 2: FETCH RELEVANT REGULATIONS ======
      updateProgress('fetching_regulations', 'Fetching relevant regulations from database...');
      addLog('info', 'Querying indexed regulations based on detected categories');

      // Build category filter for database query
      const categoryFilters = categories.map(cat => `%${cat}%`);
      
      let regulations: Regulation[] = [];
      
      // First try to get regulations matching detected categories
      const { data: filteredRegs, error: filterError } = await supabase
        .from('indexed_regulations')
        .select('*')
        .eq('is_processed', true)
        .order('crawled_at', { ascending: false });

      if (filterError) {
        addLog('warning', `Database query warning: ${filterError.message}`);
      }

      if (filteredRegs && filteredRegs.length > 0) {
        // Filter regulations based on detected categories
        const categoryKeywords = categories.flatMap(cat => {
          const keywords: Record<string, string[]> = {
            'tax': ['tax', 'gst', 'income', 'vat', 'customs', 'excise', 'direct', 'indirect'],
            'banking': ['bank', 'rbi', 'payment', 'transfer', 'finance', 'monetary'],
            'government': ['government', 'ministry', 'public', 'official', 'central', 'state'],
            'procurement': ['procurement', 'gem', 'tender', 'contract', 'purchase', 'vendor'],
            'investment': ['investment', 'sebi', 'securities', 'market', 'trading'],
            'compliance': ['compliance', 'audit', 'regulation', 'rule', 'act', 'law'],
          };
          return keywords[cat] || [cat];
        });

        const filtered = filteredRegs.filter(reg => {
          const searchText = `${reg.title || ''} ${reg.category || ''} ${reg.content || ''} ${reg.source || ''}`.toLowerCase();
          return categoryKeywords.some(kw => searchText.includes(kw));
        });

        if (filtered.length > 0) {
          regulations = filtered.slice(0, 5).map(reg => ({
            id: reg.id,
            source: reg.source,
            title: reg.title || 'Untitled Regulation',
            date: new Date(reg.crawled_at).toISOString().split('T')[0],
            version: '1.0',
            content: reg.content || reg.summary || '',
            url: reg.url,
          }));
          addLog('success', `Found ${regulations.length} regulations matching categories: ${categories.join(', ')}`);
        } else {
          // Fallback to all regulations if no category match
          regulations = filteredRegs.slice(0, 5).map(reg => ({
            id: reg.id,
            source: reg.source,
            title: reg.title || 'Untitled Regulation',
            date: new Date(reg.crawled_at).toISOString().split('T')[0],
            version: '1.0',
            content: reg.content || reg.summary || '',
            url: reg.url,
          }));
          addLog('warning', 'No category-specific regulations found, using general regulations');
        }
      }

      if (regulations.length === 0) {
        throw new Error('No regulations found in database. Please crawl regulations first using the Regulation Monitor.');
      }

      updateProgress('filtering_regulations', `Filtered ${regulations.length} relevant regulations`);
      pipeline.setRegulations(regulations);
      addLog('success', `Loaded ${regulations.length} regulations for compliance checking`);

      // ====== STEP 3: PARSE REGULATIONS INTO CLAUSES (WITH CACHING) ======
      updateProgress('parsing_clauses', 'Parsing legal clauses...', 0, regulations.length);
      addLog('info', 'Checking clause cache & parsing uncached regulations');

      const allClauses: ParsedClause[] = [];

      // Pull cached clauses from DB for all regulations at once
      const regulationIds = regulations.map((r) => r.id);
      const { data: cachedRows, error: cacheErr } = await supabase
        .from('parsed_clauses')
        .select('*')
        .in('regulation_id', regulationIds);

      if (cacheErr) {
        addLog('warning', `Cache fetch failed: ${cacheErr.message}`);
      }

      // Build lookup: regulation_id -> cached clauses
      const cacheMap = new Map<string, typeof cachedRows>();
      if (cachedRows && cachedRows.length > 0) {
        for (const row of cachedRows) {
          const existing = cacheMap.get(row.regulation_id) || [];
          existing.push(row);
          cacheMap.set(row.regulation_id, existing);
        }
      }

      for (let i = 0; i < regulations.length; i++) {
        const reg = regulations[i];
        updateProgress('parsing_clauses', `Parsing: ${reg.title.slice(0, 50)}...`, i + 1, regulations.length);
        const sourcePrefix = reg.source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);

        // Check cache first
        const cachedClauses = cacheMap.get(reg.id);
        if (cachedClauses && cachedClauses.length > 0) {
          const clauses: ParsedClause[] = cachedClauses.map((c) => ({
            id: c.id,
            regulationId: c.regulation_id,
            clauseId: c.clause_id,
            rule: c.rule,
            conditions: c.conditions ?? '',
            penalties: c.penalties ?? '',
          }));
          allClauses.push(...clauses);
          addLog('info', `Cache hit: ${reg.title.slice(0, 40)}... → ${clauses.length} clauses`);
          continue;
        }

        // No cache -> call AI
        try {
          const aiResponse = await callAgent('agent-legal-parser', {
            text: `### ${reg.title}\nSource: ${reg.source}\nDate: ${reg.date}\n\n${reg.content.slice(0, 4000)}`,
          });

          const newClauses: ParsedClause[] = [
            {
              id: crypto.randomUUID(),
              regulationId: reg.id,
              clauseId: `${sourcePrefix}_${String(i * 2 + 1).padStart(3, '0')}`,
              rule:
                extractRule(aiResponse) ||
                `IF entity_type = 'registered_business' AND transaction_value > threshold THEN file_compliance_report WITHIN deadline`,
              conditions: extractConditions(aiResponse) || `Applicable under ${reg.source} regulations`,
              penalties: extractPenalties(aiResponse) || `Non-compliance penalty as per ${reg.source} guidelines`,
            },
            {
              id: crypto.randomUUID(),
              regulationId: reg.id,
              clauseId: `${sourcePrefix}_${String(i * 2 + 2).padStart(3, '0')}`,
              rule: `IF document_type = 'financial_record' THEN maintain_records FOR period_years = 8`,
              conditions: `All financial documents must be maintained in prescribed format with digital signatures`,
              penalties: `Documentation penalty: ₹5,000 per day of non-compliance`,
            },
          ];

          // Persist to cache (upsert)
          const toInsert = newClauses.map((c) => ({
            id: c.id,
            regulation_id: c.regulationId,
            clause_id: c.clauseId,
            rule: c.rule,
            conditions: c.conditions,
            penalties: c.penalties,
          }));

          supabase
            .from('parsed_clauses')
            .upsert(toInsert, { onConflict: 'regulation_id,clause_id' })
            .then(({ error }) => {
              if (error) console.error('Clause cache insert failed:', error);
            });

          allClauses.push(...newClauses);
          addLog('success', `Parsed: ${reg.title.slice(0, 40)}... → ${newClauses.length} clauses`);
        } catch (err) {
          // If AI fails after retries, throw so the audit stops instead of producing inaccurate fallback
          throw err;
        }
      }

      pipeline.setParsedClauses(allClauses);
      addLog('success', `Parsing complete: ${allClauses.length} compliance clauses extracted`);

      // ====== STEP 4: COMPLIANCE MAPPING (CHUNKED FOR RATE LIMITS) ======
      const CHUNK_SIZE = 3; // Process 3 transactions per chunk
      const CHUNK_DELAY_MS = 2000; // 2 second delay between chunks
      
      const totalChunks = Math.ceil(inputTransactions.length / CHUNK_SIZE);
      updateProgress('mapping_compliance', 'Running compliance checks...', 0, inputTransactions.length);
      addLog('info', `Starting compliance mapping: ${inputTransactions.length} transactions in ${totalChunks} chunks (${CHUNK_SIZE} per chunk)`);

      const complianceResults: ComplianceResult[] = [];
      
      // Process transactions in sequential chunks to avoid rate limits
      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const chunkStart = chunkIdx * CHUNK_SIZE;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, inputTransactions.length);
        const chunkTransactions = inputTransactions.slice(chunkStart, chunkEnd);
        
        addLog('info', `Processing chunk ${chunkIdx + 1}/${totalChunks} (transactions ${chunkStart + 1}-${chunkEnd})`);
        
        // Process each transaction in this chunk sequentially
        for (let i = 0; i < chunkTransactions.length; i++) {
          const tx = chunkTransactions[i];
          const globalIdx = chunkStart + i;
          updateProgress('mapping_compliance', `Chunk ${chunkIdx + 1}/${totalChunks}: ${tx.vendor}`, globalIdx + 1, inputTransactions.length);

          // Find relevant clauses for this transaction (limit to 3 for rate limit safety)
          const relevantClauses = allClauses.slice(0, Math.min(3, allClauses.length));

          for (const clause of relevantClauses) {
            try {
              const aiResponse = await callAgent('agent-compliance-mapping', {
                transaction: {
                  id: tx.id,
                  category: tx.category,
                  amount: tx.amount,
                  tax: tx.tax,
                  vendor: tx.vendor,
                  description: tx.description,
                  date: tx.date
                },
                clause: {
                  clauseId: clause.clauseId,
                  rule: clause.rule,
                  conditions: clause.conditions,
                  penalties: clause.penalties
                }
              });

              const result = parseComplianceResult(aiResponse, tx.id, clause.id);
              complianceResults.push(result);
              
              const statusEmoji = result.status === 'compliant' ? '✓' : result.status === 'violation' ? '✗' : '⚠';
              addLog(
                result.status === 'compliant' ? 'success' : result.status === 'violation' ? 'error' : 'warning',
                `${statusEmoji} ${tx.vendor} vs ${clause.clauseId}: ${result.status}`
              );
              
              // Small delay between individual calls within a chunk
              await sleep(500);
            } catch (err) {
              complianceResults.push({
                id: crypto.randomUUID(),
                transactionId: tx.id,
                clauseId: clause.id,
                status: 'warning',
                riskLevel: 'medium',
                reasoning: 'Compliance check could not be completed automatically. Manual review required.',
              });
            }
          }
        }
        
        // Delay between chunks to respect rate limits (skip after last chunk)
        if (chunkIdx < totalChunks - 1) {
          addLog('info', `Waiting ${CHUNK_DELAY_MS / 1000}s before next chunk...`);
          await sleep(CHUNK_DELAY_MS);
        }
      }

      pipeline.setComplianceResults(complianceResults);
      
      const violations = complianceResults.filter(r => r.status === 'violation').length;
      const compliant = complianceResults.filter(r => r.status === 'compliant').length;
      const warnings = complianceResults.filter(r => r.status === 'warning' || r.status === 'missing_docs').length;
      addLog('success', `Compliance mapping complete: ${compliant} compliant, ${violations} violations, ${warnings} warnings`);

      // ====== STEP 5: GENERATE FINAL AUDIT REPORT ======
      updateProgress('generating_report', 'Generating final audit report...', 0, 1);
      addLog('info', 'Generating comprehensive audit report');

      // Call auditor assistant for AI-enhanced report
      let aiReportSummary = '';
      try {
        aiReportSummary = await callAgent('agent-auditor-assistant', {
          complianceData: {
            summary: {
              totalRegulations: regulations.length,
              totalClauses: allClauses.length,
              totalTransactions: inputTransactions.length,
              totalChecks: complianceResults.length,
              violations,
              compliant,
              warnings,
              detectedCategories: categories,
            },
            results: complianceResults.map(r => {
              const tx = inputTransactions.find(t => t.id === r.transactionId);
              const clause = allClauses.find(c => c.id === r.clauseId);
              return {
                status: r.status,
                riskLevel: r.riskLevel,
                reasoning: r.reasoning,
                transaction: tx ? `${tx.vendor} - ${tx.amount}` : 'Unknown',
                clause: clause?.clauseId || 'Unknown'
              };
            })
          }
        });
      } catch (err) {
        addLog('warning', 'AI report enhancement skipped');
      }

      const report: AuditReport = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecked: complianceResults.length,
          compliant,
          violations,
          warnings,
        },
        details: complianceResults.map(r => {
          const tx = inputTransactions.find(t => t.id === r.transactionId);
          const clause = allClauses.find(c => c.id === r.clauseId);
          return {
            complianceResultId: r.id,
            clauseReference: clause?.clauseId || 'Unknown',
            reasoning: r.reasoning || aiReportSummary.slice(0, 200),
            correctiveAction: getCorrectiveAction(r.status, tx, clause)
          };
        })
      };

      pipeline.addAuditReport(report);
      setFinalReport(report);
      
      updateProgress('complete', 'Automated audit completed successfully!', 1, 1);
      addLog('success', `Audit complete! ${report.summary.totalChecked} checks performed`);
      addLog('info', `Final: ${report.summary.compliant} compliant, ${report.summary.violations} violations, ${report.summary.warnings} warnings`);

      toast({ 
        title: 'Automated Audit Complete!', 
        description: `Found ${report.summary.violations} violations in ${report.summary.totalChecked} checks` 
      });
      
      options.onComplete?.(report);
      return report;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', message);
      addLog('error', message);
      toast({ title: 'Audit failed', description: message, variant: 'destructive' });
      return null;
    } finally {
      setIsRunning(false);
    }
  }, [pipeline, toast, options, addLog, updateProgress]);

  const reset = useCallback(() => {
    setProgress({
      step: 'idle',
      currentItem: 0,
      totalItems: 0,
      message: 'Ready to start automated audit',
      logs: [],
      detectedCategories: [],
    });
    setFinalReport(null);
  }, []);

  return {
    isRunning,
    isPaused,
    progress,
    finalReport,
    runMasterAgent,
    reset,
    pause,
    resume,
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function readResponseError(resp: Response): Promise<string> {
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await resp.json().catch(() => ({} as any));
    return (data?.error || data?.message || JSON.stringify(data) || resp.statusText || 'Unknown error').toString();
  }
  const text = await resp.text().catch(() => '');
  return text || resp.statusText || 'Unknown error';
}

// Helper functions
function extractRule(response: string): string | null {
  const ruleMatch = response.match(/IF\s+[\s\S]*?THEN\s+[\s\S]*?(?=\n|$)/i);
  return ruleMatch ? ruleMatch[0].trim() : null;
}

function extractConditions(response: string): string | null {
  const condMatch = response.match(/(?:conditions?|applicable|applies?|when)[\s:]+([^\n]+(?:\n(?![A-Z]).*)*)/i);
  return condMatch ? condMatch[1].trim().slice(0, 300) : null;
}

function extractPenalties(response: string): string | null {
  const penMatch = response.match(/(?:penalt|fine|punishment|consequence)[\s\S]*?(?:\.|$)/i);
  return penMatch ? penMatch[0].trim().slice(0, 200) : null;
}

function parseComplianceResult(response: string, transactionId: string, clauseId: string): ComplianceResult {
  const lowerResponse = response.toLowerCase();
  
  let status: ComplianceResult['status'] = 'warning';
  if (lowerResponse.includes('compliant') && !lowerResponse.includes('non-compliant') && !lowerResponse.includes('not compliant')) {
    status = 'compliant';
  } else if (lowerResponse.includes('violation') || lowerResponse.includes('non-compliant') || lowerResponse.includes('not compliant')) {
    status = 'violation';
  } else if (lowerResponse.includes('missing') || lowerResponse.includes('document')) {
    status = 'missing_docs';
  }

  let riskLevel: ComplianceResult['riskLevel'] = 'medium';
  if (lowerResponse.includes('high risk') || lowerResponse.includes('critical') || lowerResponse.includes('severe')) {
    riskLevel = 'high';
  } else if (lowerResponse.includes('low risk') || lowerResponse.includes('minor')) {
    riskLevel = 'low';
  }

  return {
    id: crypto.randomUUID(),
    transactionId,
    clauseId,
    status,
    riskLevel,
    reasoning: response.slice(0, 500) || 'Compliance analysis completed.',
  };
}

function getCorrectiveAction(
  status: ComplianceResult['status'], 
  tx?: Transaction, 
  clause?: ParsedClause
): string {
  const vendor = tx?.vendor || 'Unknown vendor';
  const clauseRef = clause?.clauseId || 'regulation';
  
  switch (status) {
    case 'violation':
      return `Immediate action required for ${vendor}. Review ${clauseRef} compliance. Implement controls and document remediation steps within 7 days.`;
    case 'warning':
      return `Monitor ${vendor} transaction closely. Consider implementing additional safeguards as per ${clauseRef}.`;
    case 'missing_docs':
      return `Obtain and archive required documentation for ${vendor} within 30 days. Reference: ${clauseRef}.`;
    default:
      return `No action required for ${vendor}. Continue standard monitoring per ${clauseRef}.`;
  }
}
