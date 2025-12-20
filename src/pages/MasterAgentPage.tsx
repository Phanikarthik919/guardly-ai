import { useState, useRef, useMemo } from "react";
import { 
  Cpu, 
  Upload, 
  Play, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  Shield,
  FileDown,
  Clock,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Gauge
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMasterAgent, MasterAgentStep } from "@/hooks/useMasterAgent";
import { Transaction, AuditReport } from "@/contexts/PipelineContext";
import { exportAuditReportToPdf } from "@/utils/pdfExport";
import { usePipeline } from "@/contexts/PipelineContext";
import * as XLSX from 'xlsx';

const STEP_LABELS: Record<MasterAgentStep, { label: string; icon: React.ReactNode }> = {
  'idle': { label: 'Ready', icon: <Clock className="h-4 w-4" /> },
  'analyzing_data': { label: 'Analyzing Data', icon: <TrendingUp className="h-4 w-4" /> },
  'fetching_regulations': { label: 'Fetching Regulations', icon: <FileText className="h-4 w-4" /> },
  'filtering_regulations': { label: 'Filtering Regulations', icon: <Shield className="h-4 w-4" /> },
  'parsing_clauses': { label: 'Parsing Clauses', icon: <FileSpreadsheet className="h-4 w-4" /> },
  'mapping_compliance': { label: 'Compliance Mapping', icon: <CheckCircle2 className="h-4 w-4" /> },
  'generating_report': { label: 'Generating Report', icon: <BarChart3 className="h-4 w-4" /> },
  'complete': { label: 'Complete', icon: <CheckCircle2 className="h-4 w-4" /> },
  'error': { label: 'Error', icon: <XCircle className="h-4 w-4" /> },
};

const STEPS_ORDER: MasterAgentStep[] = [
  'analyzing_data',
  'fetching_regulations',
  'filtering_regulations',
  'parsing_clauses',
  'mapping_compliance',
  'generating_report',
  'complete'
];

export default function MasterAgentPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const { complianceResults, parsedClauses } = usePipeline();

  // Concurrency control: 1 = slow (2000ms), 5 = fast (200ms)
  const [concurrencyLevel, setConcurrencyLevel] = useState<number[]>([2]); // default middle
  const minIntervalMs = useMemo(() => {
    // Map 1-5 to 2000ms - 200ms (slower = safer)
    const level = concurrencyLevel[0] ?? 2;
    return Math.round(2200 - level * 400);
  }, [concurrencyLevel]);

  const { isRunning, progress, finalReport, runMasterAgent, reset } = useMasterAgent({
    minIntervalMs,
    onComplete: (report) => {
      toast({ 
        title: 'Audit Complete!', 
        description: `Generated report with ${report.summary.totalChecked} compliance checks` 
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        if (file.name.endsWith('.json')) {
          const jsonData = JSON.parse(data as string);
          const txns = parseTransactions(Array.isArray(jsonData) ? jsonData : jsonData.transactions || [jsonData]);
          setTransactions(txns);
          toast({ title: `Loaded ${txns.length} transactions from JSON` });
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const txns = parseTransactions(jsonData);
          setTransactions(txns);
          toast({ title: `Loaded ${txns.length} transactions from ${file.name}` });
        } else {
          toast({ title: 'Unsupported file format', variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Failed to parse file', description: String(err), variant: 'destructive' });
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const parseTransactions = (data: any[]): Transaction[] => {
    return data.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      category: item.category || item.type || item.Category || 'General',
      amount: item.amount || item.Amount || item.value || '₹0',
      tax: item.tax || item.Tax || item.gst || '₹0',
      vendor: item.vendor || item.Vendor || item.party || item.name || `Vendor ${index + 1}`,
      date: item.date || item.Date || new Date().toISOString().split('T')[0],
      description: item.description || item.Description || item.remarks || '',
    }));
  };

  const handleStartAudit = async () => {
    if (transactions.length === 0) {
      toast({ title: 'Please upload transaction data first', variant: 'destructive' });
      return;
    }
    await runMasterAgent(transactions);
  };

  const handleExportPdf = () => {
    if (!finalReport) return;
    exportAuditReportToPdf({
      report: finalReport,
      complianceResults,
      transactions,
      parsedClauses
    });
    toast({ title: 'PDF report downloaded' });
  };

  const handleExportExcel = () => {
    if (!finalReport) return;

    const summaryData = [
      ['Audit Report Summary'],
      ['Generated At', new Date(finalReport.generatedAt).toLocaleString()],
      ['Total Checks', finalReport.summary.totalChecked],
      ['Compliant', finalReport.summary.compliant],
      ['Violations', finalReport.summary.violations],
      ['Warnings', finalReport.summary.warnings],
    ];

    const detailsData = [
      ['Clause Reference', 'Status', 'Reasoning', 'Corrective Action'],
      ...finalReport.details.map(d => {
        const result = complianceResults.find(r => r.id === d.complianceResultId);
        return [d.clauseReference, result?.status || 'Unknown', d.reasoning, d.correctiveAction];
      })
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Details');
    XLSX.writeFile(wb, `audit-report-${finalReport.generatedAt.split('T')[0]}.xlsx`);
    
    toast({ title: 'Excel report downloaded' });
  };

  const handleReset = () => {
    reset();
    setTransactions([]);
    setUploadedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStepProgress = () => {
    const currentIndex = STEPS_ORDER.indexOf(progress.step);
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / STEPS_ORDER.length) * 100;
  };

  const isStepComplete = (step: MasterAgentStep) => {
    const currentIndex = STEPS_ORDER.indexOf(progress.step);
    const stepIndex = STEPS_ORDER.indexOf(step);
    return stepIndex < currentIndex || progress.step === 'complete';
  };

  const isStepActive = (step: MasterAgentStep) => {
    return progress.step === step;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Cpu className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Master Agent</h1>
              <p className="text-muted-foreground">Fully automated compliance audit workflow</p>
            </div>
          </div>
          {(transactions.length > 0 || finalReport) && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input & Control */}
          <div className="space-y-4">
            {/* Upload Card */}
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Transaction Data
                </CardTitle>
                <CardDescription>
                  Upload CSV, Excel, or JSON file with your audit/transaction data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploadedFileName || 'Click to upload file'}
                    </span>
                  </div>
                </Button>

                {transactions.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Loaded Data</span>
                      <Badge variant="secondary">{transactions.length} transactions</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Categories: {[...new Set(transactions.map(t => t.category))].join(', ')}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Concurrency Slider */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Speed / Rate Limit Safety</Label>
                  </div>
                  <Slider
                    value={concurrencyLevel}
                    onValueChange={setConcurrencyLevel}
                    min={1}
                    max={5}
                    step={1}
                    disabled={isRunning}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slower (safer)</span>
                    <span className="font-medium">Level {concurrencyLevel[0]}</span>
                    <span>Faster</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {minIntervalMs}ms between calls. Use lower levels to avoid 429 rate limits.
                  </p>
                </div>

                <Separator />

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleStartAudit}
                  disabled={isRunning || transactions.length === 0}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Audit...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Automated Audit
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Progress Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={getStepProgress()} className="h-2" />
                
                <div className="space-y-2">
                  {STEPS_ORDER.slice(0, -1).map((step) => (
                    <div 
                      key={step}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        isStepActive(step) 
                          ? 'bg-primary/10 border border-primary/20' 
                          : isStepComplete(step)
                          ? 'text-muted-foreground'
                          : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isStepComplete(step) 
                          ? 'bg-success text-success-foreground' 
                          : isStepActive(step)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        {isStepComplete(step) ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isStepActive(step) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          STEP_LABELS[step].icon
                        )}
                      </div>
                      <span className={`text-sm ${isStepActive(step) ? 'font-medium' : ''}`}>
                        {STEP_LABELS[step].label}
                      </span>
                      {isStepActive(step) && progress.totalItems > 0 && (
                        <Badge variant="outline" className="ml-auto">
                          {progress.currentItem}/{progress.totalItems}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {progress.detectedCategories.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">Detected Categories:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {progress.detectedCategories.map(cat => (
                        <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results & Report */}
          <div className="lg:col-span-2 space-y-4">
            {/* Live Logs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Live Processing Log
                  </CardTitle>
                  <CardDescription>{progress.message}</CardDescription>
                </div>
                {progress.logs.length > 0 && (
                  <Badge variant="outline">{progress.logs.length} entries</Badge>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 w-full rounded-lg border bg-muted/30 p-3">
                  {progress.logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Logs will appear here when audit starts...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {progress.logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-mono">
                          <span className="text-muted-foreground shrink-0">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span className={
                            log.type === 'error' ? 'text-destructive' :
                            log.type === 'success' ? 'text-success' :
                            log.type === 'warning' ? 'text-warning' :
                            'text-foreground'
                          }>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Final Report */}
            {finalReport && (
              <Card className="border-success/30">
                <CardHeader className="bg-gradient-to-r from-success/10 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        Audit Report Ready
                      </CardTitle>
                      <CardDescription>
                        Generated on {new Date(finalReport.generatedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleExportPdf}>
                        <FileDown className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportExcel}>
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">{finalReport.summary.totalChecked}</div>
                      <div className="text-xs text-muted-foreground">Total Checks</div>
                    </div>
                    <div className="p-4 bg-success/10 rounded-lg text-center border border-success/20">
                      <div className="text-2xl font-bold text-success">{finalReport.summary.compliant}</div>
                      <div className="text-xs text-muted-foreground">Compliant</div>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg text-center border border-destructive/20">
                      <div className="text-2xl font-bold text-destructive">{finalReport.summary.violations}</div>
                      <div className="text-xs text-muted-foreground">Violations</div>
                    </div>
                    <div className="p-4 bg-warning/10 rounded-lg text-center border border-warning/20">
                      <div className="text-2xl font-bold text-warning">{finalReport.summary.warnings}</div>
                      <div className="text-xs text-muted-foreground">Warnings</div>
                    </div>
                  </div>

                  {/* Compliance Rate */}
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Compliance Rate</span>
                      <span className="text-2xl font-bold">
                        {finalReport.summary.totalChecked > 0 
                          ? Math.round((finalReport.summary.compliant / finalReport.summary.totalChecked) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={finalReport.summary.totalChecked > 0 
                        ? (finalReport.summary.compliant / finalReport.summary.totalChecked) * 100
                        : 0} 
                      className="h-2 mt-2"
                    />
                  </div>

                  {/* Detailed Findings */}
                  <Tabs defaultValue="violations">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="violations" className="gap-2">
                        <XCircle className="h-4 w-4" />
                        Violations ({finalReport.summary.violations})
                      </TabsTrigger>
                      <TabsTrigger value="warnings" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings ({finalReport.summary.warnings})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="gap-2">
                        <FileText className="h-4 w-4" />
                        All
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="violations" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {finalReport.details
                            .filter(d => {
                              const result = complianceResults.find(r => r.id === d.complianceResultId);
                              return result?.status === 'violation';
                            })
                            .map((detail, i) => (
                              <div key={i} className="p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="destructive">{detail.clauseReference}</Badge>
                                </div>
                                <p className="text-sm mb-2">{detail.reasoning}</p>
                                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                  <strong>Action:</strong> {detail.correctiveAction}
                                </p>
                              </div>
                            ))}
                          {finalReport.summary.violations === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                              No violations found!
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="warnings" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {finalReport.details
                            .filter(d => {
                              const result = complianceResults.find(r => r.id === d.complianceResultId);
                              return result?.status === 'warning' || result?.status === 'missing_docs';
                            })
                            .map((detail, i) => (
                              <div key={i} className="p-3 border border-warning/20 bg-warning/5 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="border-warning text-warning">{detail.clauseReference}</Badge>
                                </div>
                                <p className="text-sm mb-2">{detail.reasoning}</p>
                                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                  <strong>Action:</strong> {detail.correctiveAction}
                                </p>
                              </div>
                            ))}
                          {finalReport.summary.warnings === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                              No warnings found!
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="all" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {finalReport.details.slice(0, 20).map((detail, i) => {
                            const result = complianceResults.find(r => r.id === detail.complianceResultId);
                            return (
                              <div key={i} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={
                                    result?.status === 'compliant' ? 'default' :
                                    result?.status === 'violation' ? 'destructive' :
                                    'outline'
                                  }>
                                    {result?.status || 'unknown'}
                                  </Badge>
                                  <span className="text-xs font-mono text-muted-foreground">{detail.clauseReference}</span>
                                </div>
                                <p className="text-sm line-clamp-2">{detail.reasoning}</p>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!finalReport && !isRunning && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Cpu className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready for Automated Audit</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Upload your transaction/audit data and the Master Agent will automatically:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <Badge variant="outline" className="gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Analyze data categories
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Fetch relevant regulations
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Run compliance checks
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Generate downloadable report
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
