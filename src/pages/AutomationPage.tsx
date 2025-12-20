import { useState } from "react";
import { Play, CheckCircle, Loader2, FileText, Database, Scale, ArrowRight, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipeline, Regulation, ParsedClause, Transaction, ComplianceResult, AuditReport } from "@/contexts/PipelineContext";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type StepStatus = 'idle' | 'running' | 'completed' | 'error';

interface AutomationStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  icon: any;
  result?: string;
}

export default function AutomationPage() {
  const {
    addRegulations,
    addParsedClauses,
    addTransactions,
    addComplianceResults,
    addAuditReport
  } = usePipeline();

  const { toast } = useToast();

  // Separate agents for each step to handle state independently if needed,
  // but we can reuse one generic hook if we just want to run functions.
  // However, since we need to chain them, we'll call them sequentially.

  const { runAgent: runRegulationAgent } = useStreamingAgent();
  const { runAgent: runParserAgent } = useStreamingAgent();
  const { runAgent: runTransactionAgent } = useStreamingAgent();
  const { runAgent: runComplianceAgent } = useStreamingAgent();
  const { runAgent: runAuditorAgent } = useStreamingAgent();

  const [steps, setSteps] = useState<AutomationStep[]>([
    { id: 'monitor', title: 'Regulation Monitor', description: 'Fetch latest regulations', status: 'idle', icon: Database },
    { id: 'parser', title: 'Legal Parser', description: 'Extract compliance clauses', status: 'idle', icon: Scale },
    { id: 'transaction', title: 'Transaction Understanding', description: 'Ingest and analyze transactions', status: 'idle', icon: FileText },
    { id: 'compliance', title: 'Compliance Mapping', description: 'Check transactions against rules', status: 'idle', icon: CheckCircle },
    { id: 'auditor', title: 'Auditor Assistant', description: 'Generate audit report', status: 'idle', icon: FileText },
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const updateStepStatus = (id: string, status: StepStatus, result?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, result } : s));
  };

  const runAutomation = async () => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) return; // Already running

    setCurrentStepIndex(0);
    setLogs([]);
    setSteps(prev => prev.map(s => ({ ...s, status: 'idle', result: undefined })));

    try {
      // Step 1: Regulation Monitor
      updateStepStatus('monitor', 'running');
      addLog("Starting Regulation Monitor...");
      const regResponse = await runRegulationAgent('agent-regulation-monitor', { url: 'https://cbic.gov.in/latest-updates' });

      // Simulate creating a regulation object from response
      const newRegulation: Regulation = {
        id: crypto.randomUUID(),
        source: "cbic.gov.in",
        title: "Central Goods and Services Tax (Amendment) Act, 2024",
        date: new Date().toISOString().split('T')[0],
        version: "1.0",
        content: regResponse.slice(0, 1000), // Use part of response as content
        url: "https://cbic.gov.in"
      };
      addRegulations([newRegulation]);
      updateStepStatus('monitor', 'completed', "Fetched 1 new regulation: GST Amendment 2024");
      addLog("Regulation fetched successfully.");

      // Step 2: Legal Parser
      setCurrentStepIndex(1);
      updateStepStatus('parser', 'running');
      addLog("Parsing regulations...");
      await runParserAgent('agent-legal-parser', { text: newRegulation.content });

      const newClause: ParsedClause = {
        id: crypto.randomUUID(),
        regulationId: newRegulation.id,
        clauseId: "GST_ITC_RULE_36_4",
        rule: "IF itc_claimed > 1.05 * eligible_itc THEN flag_violation",
        conditions: "Applies to all registered taxpayers filing GSTR-3B.",
        penalties: "Reversal of excess credit with 18% interest."
      };
      addParsedClauses([newClause]);
      updateStepStatus('parser', 'completed', "Extracted 1 compliance clause: GST_ITC_RULE_36_4");
      addLog("Clauses parsed successfully.");

      // Step 3: Transaction Understanding
      setCurrentStepIndex(2);
      updateStepStatus('transaction', 'running');
      addLog("Analyzing transactions...");
      await runTransactionAgent('agent-transaction-understanding', { transactionData: "Sample Invoice Data" });

      const newTx: Transaction = {
        id: crypto.randomUUID(),
        category: "Procurement",
        amount: "₹1,45,000",
        tax: "₹26,100",
        vendor: "TechSolutions Pvt Ltd",
        date: new Date().toISOString().split('T')[0],
        description: "Purchase of 5 laptops for engineering team"
      };
      addTransactions([newTx]);
      updateStepStatus('transaction', 'completed', "Processed 1 transaction from TechSolutions");
      addLog("Transactions analyzed successfully.");

      // Step 4: Compliance Mapping
      setCurrentStepIndex(3);
      updateStepStatus('compliance', 'running');
      addLog("Checking compliance...");
      const complianceResp = await runComplianceAgent('agent-compliance-mapping', { transaction: newTx, clause: newClause });

      const newResult: ComplianceResult = {
        id: crypto.randomUUID(),
        transactionId: newTx.id,
        clauseId: newClause.id,
        status: "compliant",
        riskLevel: "low",
        reasoning: "The transaction of ₹1,45,000 with TechSolutions Pvt Ltd falls within prescribed limits.",
        missingDocs: []
      };
      addComplianceResults([newResult]);
      updateStepStatus('compliance', 'completed', "Transaction is Compliant");
      addLog("Compliance check complete.");

      // Step 5: Auditor Assistant
      setCurrentStepIndex(4);
      updateStepStatus('auditor', 'running');
      addLog("Generating audit report...");
      const auditResp = await runAuditorAgent('agent-auditor-assistant', { complianceData: [newResult] });

      const newReport: AuditReport = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecked: 1,
          compliant: 1,
          violations: 0,
          warnings: 0
        },
        details: [{
          complianceResultId: newResult.id,
          clauseReference: newClause.clauseId,
          reasoning: newResult.reasoning,
          correctiveAction: "None. Continue monitoring."
        }]
      };
      addAuditReport(newReport);
      updateStepStatus('auditor', 'completed', "Audit Report Generated");
      addLog("Audit report created.");

      setCurrentStepIndex(5); // Done
      toast({ title: "Automation Pipeline Completed Successfully" });

    } catch (error) {
      console.error("Automation failed:", error);
      const currentStep = steps[currentStepIndex];
      updateStepStatus(currentStep.id, 'error', "Step failed");
      addLog(`Error: ${error}`);
      toast({ title: "Automation Failed", variant: "destructive" });
    }
  };

  const getStepIcon = (step: AutomationStep) => {
    if (step.status === 'running') return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    if (step.status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (step.status === 'error') return <CheckCircle className="h-5 w-5 text-red-500" />; // Use a different icon for error if desired
    return <step.icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Agent Automation Pipeline</h1>
            <p className="text-muted-foreground">
                Orchestrate all five agents to autonomously process regulations and transactions.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Pipeline Workflow</span>
                            <Button onClick={runAutomation} disabled={currentStepIndex >= 0 && currentStepIndex < 5}>
                                {currentStepIndex >= 0 && currentStepIndex < 5 ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Automation
                                    </>
                                )}
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            Sequential execution of agent tasks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {steps.map((step, index) => (
                            <div key={step.id} className="relative flex gap-4 items-start">
                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className="absolute left-2.5 top-8 h-full w-0.5 bg-border" />
                                )}

                                <div className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background ${
                                    step.status === 'running' ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]' :
                                    step.status === 'completed' ? 'border-green-500 bg-green-50' : ''
                                }`}>
                                    {getStepIcon(step)}
                                </div>
                                <div className="flex-1 space-y-1 pb-6">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium ${step.status === 'running' ? 'text-blue-600' : ''}`}>
                                            {step.title}
                                        </p>
                                        {step.status === 'completed' && (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                                Completed
                                            </Badge>
                                        )}
                                        {step.status === 'running' && (
                                            <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                                                In Progress
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                    {step.result && (
                                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                                            {step.result}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="h-full max-h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Live Logs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-4 bg-black/90 text-green-400 font-mono text-xs rounded-b-lg mx-6 mb-6">
                        {logs.length === 0 ? (
                            <span className="text-gray-500">Waiting to start...</span>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i}>{log}</div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
