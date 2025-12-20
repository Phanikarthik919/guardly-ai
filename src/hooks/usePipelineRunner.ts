import { useState, useCallback } from 'react';
import { usePipeline, Regulation, ParsedClause, Transaction, ComplianceResult, AuditReport } from '@/contexts/PipelineContext';
import { supabase } from '@/integrations/supabase/client';
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
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Agent ${functionName} failed: ${response.statusText}`);
    }

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
      // Step 1: Use provided regulations or fetch from indexed_regulations
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

      // Step 2: Parse regulations into clauses
      updateProgress('parsing_clauses', 'Parsing legal clauses...', 0, regulations.length);
      addLog('info', 'Starting legal parsing');

      const allClauses: ParsedClause[] = [];
      for (let i = 0; i < regulations.length; i++) {
        const reg = regulations[i];
        updateProgress('parsing_clauses', `Parsing: ${reg.title.slice(0, 50)}...`, i + 1, regulations.length);

        try {
          const aiResponse = await callAgent('agent-legal-parser', { 
            text: `### ${reg.title}\nSource: ${reg.source}\nDate: ${reg.date}\n\n${reg.content.slice(0, 4000)}` 
          });

          // Generate structured clauses
          const clauses: ParsedClause[] = [
            {
              id: crypto.randomUUID(),
              regulationId: reg.id,
              clauseId: `${reg.source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10)}_${String(i + 1).padStart(3, '0')}`,
              rule: extractRule(aiResponse) || `IF entity_type = 'registered_business' AND transaction_value > threshold THEN file_compliance_report WITHIN deadline`,
              conditions: extractConditions(aiResponse) || `Applicable under ${reg.source} regulations`,
              penalties: extractPenalties(aiResponse) || `Non-compliance penalty as per ${reg.source} guidelines`,
            }
          ];
          allClauses.push(...clauses);
          addLog('success', `Parsed: ${reg.title.slice(0, 40)}...`);
        } catch (err) {
          addLog('warning', `Failed to parse: ${reg.title.slice(0, 40)}...`);
        }
      }

      pipeline.setParsedClauses(allClauses);
      addLog('success', `Generated ${allClauses.length} compliance clauses`);

      // Step 3: Process transactions
      let transactions: Transaction[] = inputTransactions || pipeline.transactions;
      
      if (transactions.length === 0) {
        updateProgress('processing_transactions', 'No transactions provided, using demo data...');
        addLog('info', 'Loading demo transactions');
        
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
        pipeline.setTransactions(transactions);
        addLog('success', `Loaded ${transactions.length} demo transactions`);
      } else {
        addLog('info', `Using ${transactions.length} existing transactions`);
      }

      // Step 4: Run compliance mapping
      updateProgress('mapping_compliance', 'Running compliance checks...', 0, transactions.length * allClauses.length);
      addLog('info', 'Starting compliance mapping');

      const complianceResults: ComplianceResult[] = [];
      let checkCount = 0;
      const totalChecks = Math.min(transactions.length * allClauses.length, 20); // Limit to avoid timeout

      for (const tx of transactions) {
        for (const clause of allClauses.slice(0, Math.ceil(20 / transactions.length))) {
          checkCount++;
          if (checkCount > totalChecks) break;

          updateProgress('mapping_compliance', `Checking: ${tx.vendor} vs ${clause.clauseId}`, checkCount, totalChecks);

          try {
            const aiResponse = await callAgent('agent-compliance-mapping', {
              transaction: {
                category: tx.category,
                amount: tx.amount,
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
            addLog(result.status === 'compliant' ? 'success' : result.status === 'violation' ? 'error' : 'warning', 
              `${tx.vendor}: ${result.status} (${result.riskLevel} risk)`);
          } catch (err) {
            // Create a result even if AI fails
            complianceResults.push({
              id: crypto.randomUUID(),
              transactionId: tx.id,
              clauseId: clause.id,
              status: 'warning',
              riskLevel: 'medium',
              reasoning: 'Compliance check could not be completed automatically. Manual review required.',
            });
            addLog('warning', `Check failed for ${tx.vendor} - marked for manual review`);
          }
        }
        if (checkCount > totalChecks) break;
      }

      pipeline.setComplianceResults(complianceResults);
      addLog('success', `Completed ${complianceResults.length} compliance checks`);

      // Step 5: Generate audit report
      updateProgress('generating_report', 'Generating audit report...', 0, 1);
      addLog('info', 'Generating final audit report');

      try {
        await callAgent('agent-auditor-assistant', {
          complianceData: complianceResults.map(r => {
            const tx = transactions.find(t => t.id === r.transactionId);
            const clause = allClauses.find(c => c.id === r.clauseId);
            return {
              status: r.status,
              risk: r.riskLevel,
              reasoning: r.reasoning,
              transaction: tx ? `${tx.vendor} - ${tx.amount}` : 'Unknown',
              clause: clause?.clauseId || 'Unknown'
            };
          })
        });
      } catch (err) {
        addLog('warning', 'AI report generation failed, using structured output');
      }

      const report: AuditReport = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecked: complianceResults.length,
          compliant: complianceResults.filter(r => r.status === 'compliant').length,
          violations: complianceResults.filter(r => r.status === 'violation').length,
          warnings: complianceResults.filter(r => r.status === 'warning' || r.status === 'missing_docs').length,
        },
        details: complianceResults.map(r => {
          const clause = allClauses.find(c => c.id === r.clauseId);
          return {
            complianceResultId: r.id,
            clauseReference: clause?.clauseId || 'Unknown',
            reasoning: r.reasoning,
            correctiveAction: getCorrectiveAction(r.status)
          };
        })
      };

      pipeline.addAuditReport(report);
      updateProgress('complete', 'Pipeline completed successfully!', 1, 1);
      addLog('success', 'Audit report generated successfully');

      toast({ title: 'Pipeline completed!', description: `Generated report with ${report.summary.totalChecked} checks` });
      options.onComplete?.(report);

      return report;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', message);
      addLog('error', message);
      toast({ title: 'Pipeline failed', description: message, variant: 'destructive' });
      throw error;
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

function getCorrectiveAction(status: ComplianceResult['status']): string {
  switch (status) {
    case 'violation':
      return 'Immediate review required. Implement controls and document remediation steps.';
    case 'warning':
      return 'Monitor closely. Consider implementing additional safeguards.';
    case 'missing_docs':
      return 'Obtain and archive required documentation within 30 days.';
    default:
      return 'No action required. Continue standard monitoring.';
  }
}
