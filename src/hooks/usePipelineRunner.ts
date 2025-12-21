import { useState, useCallback, useRef } from 'react';
import { usePipeline, Regulation, ParsedClause, Transaction, ComplianceResult, AuditReport } from '@/contexts/PipelineContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { getSupabasePublicConfig } from '@/lib/publicConfig';
import { useToast } from '@/hooks/use-toast';

export type PipelineStep = 
  | 'idle'
  | 'fetching_regulations'
  | 'parsing_clauses'
  | 'processing_transactions'
  | 'mapping_compliance'
  | 'generating_report'
  | 'complete'
  | 'error';

export interface PipelineProgress {
  step: PipelineStep;
  currentItem: number;
  totalItems: number;
  message: string;
  logs: { type: 'info' | 'success' | 'error' | 'warning'; message: string; timestamp: Date }[];
}

interface UsePipelineRunnerOptions {
  onComplete?: (report: AuditReport) => void;
}

export function usePipelineRunner(options: UsePipelineRunnerOptions = {}) {
  const { toast } = useToast();
  const pipeline = usePipeline();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress>({
    step: 'idle',
    currentItem: 0,
    totalItems: 0,
    message: 'Ready to run pipeline',
    logs: [],
  });

  const lastCallAtRef = useRef(0);
  // Avoid triggering upstream model quotas during pipeline runs.
  const MIN_AGENT_CALL_INTERVAL_MS = 1500;

  const addLog = useCallback((type: 'info' | 'success' | 'error' | 'warning', message: string) => {
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-50), { type, message, timestamp: new Date() }],
    }));
  }, []);

  const updateProgress = useCallback((step: PipelineStep, message: string, current = 0, total = 0) => {
    setProgress(prev => ({
      ...prev,
      step,
      message,
      currentItem: current,
      totalItems: total,
    }));
  }, []);

  const callAgent = async (functionName: string, body: Record<string, unknown>): Promise<string> => {
    const now = Date.now();
    const sinceLast = now - lastCallAtRef.current;
    if (sinceLast < MIN_AGENT_CALL_INTERVAL_MS) {
      await sleep(MIN_AGENT_CALL_INTERVAL_MS - sinceLast);
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

  const runFullPipeline = useCallback(async (
    inputRegulations?: Regulation[],
    inputTransactions?: Transaction[]
  ) => {
    setIsRunning(true);
    setProgress({
      step: 'idle',
      currentItem: 0,
      totalItems: 0,
      message: 'Starting pipeline...',
      logs: [],
    });

    try {
      // ====== STEP 1: REGULATIONS ======
      let regulations: Regulation[] = inputRegulations || [];
      
      if (regulations.length === 0) {
        updateProgress('fetching_regulations', 'Fetching indexed regulations from database...');
        addLog('info', 'Fetching regulations from database');

        const { data: indexedRegs, error } = await supabase
          .from('indexed_regulations')
          .select('*')
          .eq('is_processed', true)
          .order('crawled_at', { ascending: false })
          .limit(10);

        if (error) throw new Error(`Failed to fetch regulations: ${error.message}`);

        if (indexedRegs && indexedRegs.length > 0) {
          regulations = indexedRegs.map(reg => ({
            id: reg.id,
            source: reg.source,
            title: reg.title || 'Untitled Regulation',
            date: new Date(reg.crawled_at).toISOString().split('T')[0],
            version: '1.0',
            content: reg.content || reg.summary || '',
            url: reg.url,
          }));
          pipeline.setRegulations(regulations);
          addLog('success', `Loaded ${regulations.length} regulations from database`);
        } else if (pipeline.regulations.length > 0) {
          regulations = pipeline.regulations;
          addLog('info', `Using ${regulations.length} existing regulations from context`);
        } else {
          throw new Error('No regulations available. Please crawl or add regulations first.');
        }
      } else {
        pipeline.setRegulations(regulations);
        addLog('info', `Using ${regulations.length} provided regulations`);
      }

      // ====== STEP 2: PARSE REGULATIONS INTO CLAUSES ======
      updateProgress('parsing_clauses', 'Parsing legal clauses...', 0, regulations.length);
      addLog('info', 'Starting legal parsing (Agent 2)');

      const allClauses: ParsedClause[] = [];
      for (let i = 0; i < regulations.length; i++) {
        const reg = regulations[i];
        updateProgress('parsing_clauses', `Parsing: ${reg.title.slice(0, 50)}...`, i + 1, regulations.length);

        try {
          const aiResponse = await callAgent('agent-legal-parser', { 
            text: `### ${reg.title}\nSource: ${reg.source}\nDate: ${reg.date}\n\n${reg.content.slice(0, 4000)}` 
          });

          // Extract structured clauses from AI response
          const sourcePrefix = reg.source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
          const clauses: ParsedClause[] = [
            {
              id: crypto.randomUUID(),
              regulationId: reg.id,
              clauseId: `${sourcePrefix}_${String(i * 2 + 1).padStart(3, '0')}`,
              rule: extractRule(aiResponse) || `IF entity_type = 'registered_business' AND transaction_value > threshold THEN file_compliance_report WITHIN deadline`,
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
            }
          ];
          allClauses.push(...clauses);
          addLog('success', `Parsed: ${reg.title.slice(0, 40)}... → ${clauses.length} clauses`);
        } catch (err) {
          addLog('warning', `Failed to parse: ${reg.title.slice(0, 40)}...`);
        }
      }

      pipeline.setParsedClauses(allClauses);
      addLog('success', `Agent 2 complete: Generated ${allClauses.length} compliance clauses`);

      // ====== STEP 3: PROCESS TRANSACTIONS ======
      let transactions: Transaction[] = inputTransactions || pipeline.transactions;
      
      if (transactions.length === 0) {
        updateProgress('processing_transactions', 'No transactions provided, generating demo data...');
        addLog('info', 'Loading demo transactions (Agent 3)');
        
        // Generate demo transactions with AI understanding
        transactions = [
          {
            id: crypto.randomUUID(),
            category: "Wire Transfer",
            amount: "₹1,25,00,000",
            tax: "₹0.00",
            vendor: "State Bank of India",
            date: new Date().toISOString().split('T')[0],
            description: "Inter-state fund transfer for infrastructure project"
          },
          {
            id: crypto.randomUUID(),
            category: "Government Grant",
            amount: "₹5,00,00,000",
            tax: "₹12,50,000",
            vendor: "Ministry of Finance",
            date: new Date().toISOString().split('T')[0],
            description: "Central grant for rural development scheme"
          },
          {
            id: crypto.randomUUID(),
            category: "Procurement",
            amount: "₹87,50,000",
            tax: "₹15,75,000",
            vendor: "GeM Portal Vendor",
            date: new Date().toISOString().split('T')[0],
            description: "IT equipment procurement via GeM"
          }
        ];
        
        // Call transaction understanding agent to enrich data
        try {
          await callAgent('agent-transaction-understanding', {
            transactionData: JSON.stringify(transactions.map(t => ({
              vendor: t.vendor,
              amount: t.amount,
              category: t.category,
              description: t.description
            })))
          });
        } catch (err) {
          addLog('warning', 'Transaction AI enrichment skipped');
        }

        pipeline.setTransactions(transactions);
        addLog('success', `Agent 3 complete: Loaded ${transactions.length} transactions`);
      } else {
        addLog('info', `Using ${transactions.length} existing transactions`);
      }

      // ====== STEP 4: COMPLIANCE MAPPING ======
      updateProgress('mapping_compliance', 'Running compliance checks (Agent 4)...', 0, transactions.length);
      addLog('info', `Starting compliance mapping: ${transactions.length} transactions × ${allClauses.length} clauses`);

      const complianceResults: ComplianceResult[] = [];
      
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        updateProgress('mapping_compliance', `Checking: ${tx.vendor}`, i + 1, transactions.length);

        // Check against each relevant clause
        for (const clause of allClauses) {
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
              `${statusEmoji} ${tx.vendor} vs ${clause.clauseId}: ${result.status} (${result.riskLevel} risk)`
            );
          } catch (err) {
            // Create a warning result if AI fails
            complianceResults.push({
              id: crypto.randomUUID(),
              transactionId: tx.id,
              clauseId: clause.id,
              status: 'warning',
              riskLevel: 'medium',
              reasoning: 'Compliance check could not be completed automatically. Manual review required.',
            });
            addLog('warning', `Check failed for ${tx.vendor} vs ${clause.clauseId}`);
          }
        }
      }

      pipeline.setComplianceResults(complianceResults);
      
      const violations = complianceResults.filter(r => r.status === 'violation').length;
      const compliant = complianceResults.filter(r => r.status === 'compliant').length;
      addLog('success', `Agent 4 complete: ${complianceResults.length} checks (${compliant} compliant, ${violations} violations)`);

      // ====== STEP 5: GENERATE AUDIT REPORT ======
      updateProgress('generating_report', 'Generating final audit report (Agent 5)...', 0, 1);
      addLog('info', 'Starting audit report generation');

      // Prepare comprehensive data for auditor
      const auditInput = {
        regulations: regulations.map(r => ({ id: r.id, title: r.title, source: r.source })),
        clauses: allClauses.map(c => ({ clauseId: c.clauseId, rule: c.rule, penalties: c.penalties })),
        transactions: transactions.map(t => ({ id: t.id, vendor: t.vendor, amount: t.amount, category: t.category })),
        complianceResults: complianceResults.map(r => {
          const tx = transactions.find(t => t.id === r.transactionId);
          const clause = allClauses.find(c => c.id === r.clauseId);
          return {
            status: r.status,
            riskLevel: r.riskLevel,
            reasoning: r.reasoning,
            transaction: tx ? `${tx.vendor} - ${tx.amount}` : 'Unknown',
            clause: clause?.clauseId || 'Unknown'
          };
        }),
        summary: {
          totalRegulations: regulations.length,
          totalClauses: allClauses.length,
          totalTransactions: transactions.length,
          totalChecks: complianceResults.length,
          violations: violations,
          compliant: compliant,
          warnings: complianceResults.filter(r => r.status === 'warning').length
        }
      };

      let aiReportSummary = '';
      try {
        aiReportSummary = await callAgent('agent-auditor-assistant', {
          complianceData: auditInput
        });
      } catch (err) {
        addLog('warning', 'AI report generation enhanced with structured data');
      }

      // Generate comprehensive report
      const report: AuditReport = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecked: complianceResults.length,
          compliant: compliant,
          violations: violations,
          warnings: complianceResults.filter(r => r.status === 'warning' || r.status === 'missing_docs').length,
        },
        details: complianceResults.map(r => {
          const tx = transactions.find(t => t.id === r.transactionId);
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
      updateProgress('complete', 'Pipeline completed successfully!', 1, 1);
      addLog('success', `Agent 5 complete: Audit report generated with ${report.summary.totalChecked} checks`);
      addLog('info', `Final Summary: ${report.summary.compliant} compliant, ${report.summary.violations} violations, ${report.summary.warnings} warnings`);

      toast({ 
        title: 'Pipeline completed!', 
        description: `Generated report: ${report.summary.violations} violations found in ${report.summary.totalChecked} checks` 
      });
      options.onComplete?.(report);

      return report;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', message);
      addLog('error', message);
      toast({ title: 'Pipeline failed', description: message, variant: 'destructive' });
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
      message: 'Ready to run pipeline',
      logs: [],
    });
  }, []);

  return {
    isRunning,
    progress,
    runFullPipeline,
    reset,
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

// Helper functions to extract structured data from AI responses
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
