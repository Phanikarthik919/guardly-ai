import React, { useState } from 'react';
import { usePipeline, Transaction, ComplianceResult, ComplianceClause, Violation, AuditReport } from "@/contexts/PipelineContext";
import { MOCK_REGULATIONS, MOCK_CLAUSES, MOCK_TRANSACTIONS } from "@/lib/mockData";
import { checkCompliance } from "@/lib/compliance-logic";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Play, RefreshCw, XCircle, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const AutomationPage = () => {
  const {
    regulations, setRegulations,
    clauses, setClauses,
    transactions, setTransactions,
    results, setResults,
    reports, setReports,
    clearAll
  } = usePipeline();

  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = [
    { id: 1, name: "Regulation Monitoring", description: "Fetching latest government regulations" },
    { id: 2, name: "Legal Parsing", description: "Converting regulations to machine-readable rules" },
    { id: 3, name: "Transaction Understanding", description: "Extracting transaction data" },
    { id: 4, name: "Compliance Mapping", description: "Detecting violations (Tax, Bids, Docs)" },
    { id: 5, name: "Auditor Assistant", description: "Generating audit reports and actions" },
  ];

  const handleStartAutomation = async () => {
    clearAll();
    setCurrentStep(1);
    setIsProcessing(true);

    try {
      // Step 1: Regulation Monitoring
      await processStep1();

      // Step 2: Legal Parsing
      setCurrentStep(2);
      await processStep2();

      // Step 3: Transaction Understanding
      setCurrentStep(3);
      await processStep3();

      // Step 4: Compliance Mapping
      setCurrentStep(4);
      await processStep4();

      // Step 5: Auditor Assistant
      setCurrentStep(5);
      await processStep5();

      setCurrentStep(6); // Finished
      toast({
        title: "Automation Complete",
        description: "All agents have successfully finished processing.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Automation Failed",
        description: "An error occurred during the automation process.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep1 = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRegulations(MOCK_REGULATIONS);
  };

  const processStep2 = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setClauses(MOCK_CLAUSES);
  };

  const processStep3 = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setTransactions(MOCK_TRANSACTIONS);
  };

  const processStep4 = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const calculatedResults: ComplianceResult[] = [];
    for (const tx of MOCK_TRANSACTIONS) {
       const txResult = checkCompliance(tx, MOCK_CLAUSES);
       calculatedResults.push(txResult);
    }
    setResults(calculatedResults);
  };

  const processStep5 = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Recalculate results locally to generate report
    const calculatedResults: ComplianceResult[] = [];
    for (const tx of MOCK_TRANSACTIONS) {
       const txResult = checkCompliance(tx, MOCK_CLAUSES);
       calculatedResults.push(txResult);
    }

    const violationResults = calculatedResults.filter(r => !r.is_compliant);
    const totalViolations = violationResults.reduce((acc, r) => acc + r.violations.length, 0);
    const avgRisk = violationResults.length > 0
        ? violationResults.reduce((acc, r) => acc + r.risk_score, 0) / violationResults.length
        : 0;

    const report: AuditReport = {
        id: "REPORT_" + new Date().toISOString().split('T')[0],
        transaction_id: "BATCH_" + new Date().getTime(),
        generated_at: new Date().toISOString(),
        status: 'FINAL',
        summary: `Audit completed for ${calculatedResults.length} transactions. Found ${violationResults.length} non-compliant transactions with ${totalViolations} total violations.`,
        risk_assessment: avgRisk > 0.5 ? "HIGH RISK" : avgRisk > 0.2 ? "MEDIUM RISK" : "LOW RISK",
        recommendations: [
            "Ensure all vendors submit project orders.",
            "Verify tax calculations before payment.",
            "Enforce 3-bid rule strictly for procurements > 10L."
        ]
    };

    setReports([report]);
  };

  const getStepStatus = (stepId: number) => {
    if (currentStep === stepId && isProcessing) return 'processing';
    if (currentStep > stepId) return 'completed';
    return 'pending';
  };

  return (
    <DashboardLayout>
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Automation Pipeline</h1>
            <p className="text-muted-foreground">
                Sequential execution of all 5 compliance agents.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="col-span-1 lg:col-span-1 border-primary/20">
                <CardHeader className="bg-primary/5">
                    <CardTitle>Pipeline Control</CardTitle>
                    <CardDescription>Start or reset the automation</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <Button
                        size="lg"
                        className="w-full"
                        onClick={handleStartAutomation}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Start Automation
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={() => { clearAll(); setCurrentStep(0); }}
                        disabled={isProcessing}
                    >
                        Reset Pipeline
                    </Button>

                    <div className="mt-8 space-y-4">
                        {steps.map((step) => (
                            <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                    ${getStepStatus(step.id) === 'completed' ? 'bg-green-100 text-green-600' :
                                      getStepStatus(step.id) === 'processing' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                                      'bg-gray-100 text-gray-400'}
                                `}>
                                    {getStepStatus(step.id) === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                                     getStepStatus(step.id) === 'processing' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                                     <span className="text-sm font-medium">{step.id}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${currentStep === step.id ? 'text-primary' : ''}`}>
                                        {step.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="col-span-1 lg:col-span-2 space-y-6">
                {/* Live Output Section */}
                <Card className="min-h-[500px]">
                    <CardHeader>
                        <CardTitle>Live Execution Output</CardTitle>
                        <CardDescription>Real-time results from active agents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentStep === 0 && (
                            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                                <Play className="w-12 h-12 mb-4 opacity-20" />
                                <p>Click "Start Automation" to begin monitoring.</p>
                            </div>
                        )}

                        {currentStep >= 1 && (
                           <div className="space-y-6 animate-in fade-in duration-500">
                               {regulations.length > 0 && (
                                   <div className="p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/20">
                                       <h3 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                                           <CheckCircle2 className="w-4 h-4" /> Regulations Fetched ({regulations.length})
                                       </h3>
                                       <div className="text-sm text-green-800/80 dark:text-green-300 pl-6">
                                           {regulations.map(r => <div key={r.id}>• {r.name}</div>)}
                                       </div>
                                   </div>
                               )}

                               {clauses.length > 0 && currentStep >= 2 && (
                                   <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
                                       <h3 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                                           <CheckCircle2 className="w-4 h-4" /> Clauses Parsed ({clauses.length})
                                       </h3>
                                       <div className="text-sm text-blue-800/80 dark:text-blue-300 pl-6 grid gap-1">
                                           {clauses.map(c => (
                                               <div key={c.id} className="flex gap-2">
                                                   <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">{c.id}</span>
                                                   <span>{c.rule_name}</span>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               )}

                               {transactions.length > 0 && currentStep >= 3 && (
                                   <div className="p-4 border rounded-lg bg-purple-50/50 dark:bg-purple-900/20">
                                       <h3 className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2 mb-2">
                                           <CheckCircle2 className="w-4 h-4" /> Transactions Processed ({transactions.length})
                                       </h3>
                                       <div className="text-sm text-purple-800/80 dark:text-purple-300 pl-6">
                                            {transactions.map(t => (
                                                <div key={t.id} className="flex justify-between items-center border-b border-purple-100 dark:border-purple-800 last:border-0 py-1">
                                                    <span>{t.id} - {t.vendor_name}</span>
                                                    <span className="font-mono">₹{t.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                       </div>
                                   </div>
                               )}

                               {results.length > 0 && currentStep >= 4 && (
                                   <div className="p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-900/20">
                                       <h3 className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-2">
                                           <CheckCircle2 className="w-4 h-4" /> Compliance Check Complete
                                       </h3>
                                       <div className="space-y-3 mt-3">
                                            {results.filter(r => !r.is_compliant).map((r, idx) => (
                                                <div key={idx} className="bg-white dark:bg-card p-3 rounded border border-orange-200 dark:border-orange-800 shadow-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                                            <XCircle className="w-3 h-3" /> VIOLATION DETECTED
                                                        </span>
                                                        <Badge variant={r.risk_score > 0.6 ? 'destructive' : 'secondary'}>
                                                            Risk: {Math.round(r.risk_score * 100)}%
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-2 flex-wrap mt-2">
                                                        {r.violations.map((v, vIdx) => (
                                                            <div key={vIdx} className="w-full text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">
                                                                <span className="font-semibold text-red-700 dark:text-red-400 block">{v.type}</span>
                                                                <span className="text-gray-600 dark:text-gray-300">{v.description}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {results.every(r => r.is_compliant) && (
                                                <div className="text-green-600 dark:text-green-400 bg-white dark:bg-card p-3 rounded text-sm text-center">
                                                    All transactions are compliant!
                                                </div>
                                            )}
                                       </div>
                                   </div>
                               )}

                               {reports.length > 0 && currentStep >= 5 && (
                                   <div className="p-4 border rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                                           <FileText className="w-4 h-4" /> Final Audit Report Generated
                                       </h3>
                                       <div className="bg-white dark:bg-card p-4 rounded border text-sm space-y-2">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                    <div className="text-2xl font-bold">{results.filter(r => !r.is_compliant).length}</div>
                                                    <div className="text-xs text-muted-foreground">Violations Found</div>
                                                </div>
                                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                                    <div className="text-2xl font-bold">{reports[0].risk_assessment}</div>
                                                    <div className="text-xs text-muted-foreground">Overall Assessment</div>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="font-semibold">Recommendations:</span>
                                                <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-600 dark:text-gray-300">
                                                    {reports[0].recommendations.map((rec, i) => (
                                                        <li key={i}>{rec}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                       </div>
                                   </div>
                               )}
                           </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
  );
};

export default AutomationPage;
