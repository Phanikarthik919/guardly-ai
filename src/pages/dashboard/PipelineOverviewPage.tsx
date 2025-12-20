import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Radio, 
  FileText, 
  Receipt, 
  GitCompare, 
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Play,
  Loader2,
  RefreshCw,
  XCircle,
  Info
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePipeline } from "@/contexts/PipelineContext";
import { usePipelineRunner, PipelineStep } from "@/hooks/usePipelineRunner";

const agentSteps = [
  { 
    title: "Regulation Monitoring", 
    icon: Radio,
    url: "/agents/regulation-monitor",
    dataKey: "regulations" as const,
    stepKey: "fetching_regulations" as PipelineStep,
    color: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/30",
    activeColor: "bg-blue-500"
  },
  { 
    title: "Legal Parsing", 
    icon: FileText,
    url: "/agents/legal-parser",
    dataKey: "parsedClauses" as const,
    stepKey: "parsing_clauses" as PipelineStep,
    color: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/30",
    activeColor: "bg-purple-500"
  },
  { 
    title: "Transaction Understanding", 
    icon: Receipt,
    url: "/agents/transaction-understanding",
    dataKey: "transactions" as const,
    stepKey: "processing_transactions" as PipelineStep,
    color: "from-green-500/20 to-green-500/5",
    borderColor: "border-green-500/30",
    activeColor: "bg-green-500"
  },
  { 
    title: "Compliance Mapping", 
    icon: GitCompare,
    url: "/agents/compliance-mapping",
    dataKey: "complianceResults" as const,
    stepKey: "mapping_compliance" as PipelineStep,
    color: "from-orange-500/20 to-orange-500/5",
    borderColor: "border-orange-500/30",
    activeColor: "bg-orange-500"
  },
  { 
    title: "Auditor Assistant", 
    icon: ClipboardCheck,
    url: "/agents/auditor-assistant",
    dataKey: "auditReports" as const,
    stepKey: "generating_report" as PipelineStep,
    color: "from-red-500/20 to-red-500/5",
    borderColor: "border-red-500/30",
    activeColor: "bg-red-500"
  },
];

const stepOrder: PipelineStep[] = [
  'fetching_regulations',
  'parsing_clauses',
  'processing_transactions',
  'mapping_compliance',
  'generating_report',
];

export default function PipelineOverviewPage() {
  const navigate = useNavigate();
  const pipeline = usePipeline();
  const { isRunning, progress, runFullPipeline, reset } = usePipelineRunner({
    onComplete: (report) => {
      console.log('Pipeline complete:', report);
    }
  });

  const getCount = (dataKey: typeof agentSteps[number]['dataKey']) => {
    return pipeline[dataKey]?.length || 0;
  };

  const totalItems = agentSteps.reduce((sum, step) => sum + getCount(step.dataKey), 0);
  const activeSteps = agentSteps.filter(step => getCount(step.dataKey) > 0).length;
  const pipelineProgress = (activeSteps / agentSteps.length) * 100;

  // Compliance stats
  const complianceStats = {
    compliant: pipeline.complianceResults.filter(r => r.status === 'compliant').length,
    violations: pipeline.complianceResults.filter(r => r.status === 'violation').length,
    warnings: pipeline.complianceResults.filter(r => r.status === 'warning').length,
    total: pipeline.complianceResults.length,
  };

  const complianceRate = complianceStats.total > 0 
    ? Math.round((complianceStats.compliant / complianceStats.total) * 100) 
    : 0;

  const getStepStatus = (stepKey: PipelineStep) => {
    if (progress.step === 'error') return 'error';
    if (progress.step === 'complete') return 'complete';
    if (progress.step === stepKey) return 'active';
    
    const currentIndex = stepOrder.indexOf(progress.step);
    const stepIndex = stepOrder.indexOf(stepKey);
    if (currentIndex > stepIndex) return 'complete';
    return 'pending';
  };

  const handleRunPipeline = async () => {
    try {
      await runFullPipeline();
    } catch (error) {
      console.error('Pipeline failed:', error);
    }
  };

  const handleResetPipeline = () => {
    pipeline.clearAll();
    reset();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Pipeline Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated end-to-end compliance pipeline with AI agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleResetPipeline} 
              variant="outline" 
              size="sm"
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button 
              onClick={handleRunPipeline}
              disabled={isRunning}
              size="sm"
              className="min-w-[140px]"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Pipeline
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSteps}/5</p>
                  <p className="text-xs text-muted-foreground">Active Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalItems}</p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{complianceStats.violations}</p>
                  <p className="text-xs text-muted-foreground">Violations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/50 to-secondary/30 border-secondary/40">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{complianceRate}%</p>
                  <p className="text-xs text-muted-foreground">Compliance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Progress - shown when running */}
        {(isRunning || progress.step !== 'idle') && (
          <Card className={`border-2 ${progress.step === 'error' ? 'border-destructive/50' : progress.step === 'complete' ? 'border-success/50' : 'border-primary/50'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {progress.step === 'error' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : progress.step === 'complete' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  )}
                  Pipeline Execution
                </CardTitle>
                {progress.totalItems > 0 && (
                  <Badge variant="secondary">
                    {progress.currentItem} / {progress.totalItems}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step Progress */}
              <div className="flex items-center gap-2">
                {agentSteps.map((step, index) => {
                  const status = getStepStatus(step.stepKey);
                  return (
                    <div key={step.title} className="flex items-center flex-1">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                        ${status === 'active' ? `${step.activeColor} text-white animate-pulse` : 
                          status === 'complete' ? 'bg-success text-white' : 
                          status === 'error' ? 'bg-destructive text-white' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : 
                         status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                         index + 1}
                      </div>
                      {index < agentSteps.length - 1 && (
                        <div className={`flex-1 h-1 mx-1 rounded ${
                          status === 'complete' || getStepStatus(agentSteps[index + 1]?.stepKey) !== 'pending' 
                            ? 'bg-success' 
                            : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Logs */}
              {progress.logs.length > 0 && (
                <ScrollArea className="h-32 border rounded-lg p-3 bg-muted/30">
                  <div className="space-y-1 font-mono text-xs">
                    {progress.logs.slice(-15).map((log, i) => (
                      <div key={i} className={`flex items-start gap-2 ${
                        log.type === 'error' ? 'text-destructive' :
                        log.type === 'success' ? 'text-success' :
                        log.type === 'warning' ? 'text-warning' :
                        'text-muted-foreground'
                      }`}>
                        <span className="opacity-50 shrink-0">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Static Pipeline Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Progress</CardTitle>
            <CardDescription>
              Track the progress of your compliance workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall completion</span>
                <span className="font-medium">{Math.round(pipelineProgress)}%</span>
              </div>
              <Progress value={pipelineProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Agent Pipeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {agentSteps.map((step, index) => {
            const count = getCount(step.dataKey);
            const isActive = count > 0;
            const stepStatus = getStepStatus(step.stepKey);
            
            return (
              <Card 
                key={step.title}
                className={`relative cursor-pointer transition-all hover:shadow-md ${step.borderColor} ${
                  stepStatus === 'active' ? 'border-2 ring-2 ring-primary/20' :
                  isActive ? 'border-2' : 'border border-dashed'
                }`}
                onClick={() => navigate(step.url)}
              >
                <CardContent className={`pt-4 bg-gradient-to-br ${step.color} h-full`}>
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs font-mono">Step {index + 1}</span>
                      {stepStatus === 'active' && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-full ${
                      stepStatus === 'active' ? 'bg-primary/30 animate-pulse' :
                      isActive ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <step.icon className={`h-6 w-6 ${
                        stepStatus === 'active' ? 'text-primary' :
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-sm">{step.title}</h3>
                      <Badge 
                        variant={isActive ? "default" : "outline"} 
                        className="mt-2"
                      >
                        {count} items
                      </Badge>
                    </div>

                    {index < agentSteps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground absolute -right-3 top-1/2 -translate-y-1/2 hidden md:block" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {agentSteps.map((step) => (
                <Button 
                  key={step.title}
                  variant="outline" 
                  className="h-auto py-3 flex flex-col items-center gap-2"
                  onClick={() => navigate(step.url)}
                >
                  <step.icon className="h-5 w-5" />
                  <span className="text-xs text-center">{step.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Card - How the Pipeline Works */}
        {progress.step === 'idle' && totalItems === 0 && (
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                How the Pipeline Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Click <strong>"Run Pipeline"</strong> to execute all agents automatically:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li><strong>Regulation Monitor</strong> → Fetches indexed regulations from the database</li>
                <li><strong>Legal Parser</strong> → Converts regulations into IF-THEN compliance clauses</li>
                <li><strong>Transaction Understanding</strong> → Processes financial transactions</li>
                <li><strong>Compliance Mapping</strong> → Checks transactions against clauses</li>
                <li><strong>Auditor Assistant</strong> → Generates final audit report with recommendations</li>
              </ol>
              <p className="text-xs mt-4">
                💡 For best results, first crawl regulations using the Regulation Monitor, or add transactions via Transaction Understanding.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Summary */}
        {pipeline.auditReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Audit Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pipeline.auditReports.slice(-3).reverse().map((report) => (
                  <div 
                    key={report.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => navigate('/agents/auditor-assistant')}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Audit Report - {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.summary.totalChecked} items checked
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-success border-success/30">
                        {report.summary.compliant} ✓
                      </Badge>
                      {report.summary.violations > 0 && (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          {report.summary.violations} ✕
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
