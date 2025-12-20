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
  BarChart3
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePipeline } from "@/contexts/PipelineContext";

const agentSteps = [
  { 
    title: "Regulation Monitoring", 
    icon: Radio,
    url: "/agents/regulation-monitor",
    dataKey: "regulations" as const,
    color: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/30"
  },
  { 
    title: "Legal Parsing", 
    icon: FileText,
    url: "/agents/legal-parser",
    dataKey: "parsedClauses" as const,
    color: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/30"
  },
  { 
    title: "Transaction Understanding", 
    icon: Receipt,
    url: "/agents/transaction-understanding",
    dataKey: "transactions" as const,
    color: "from-green-500/20 to-green-500/5",
    borderColor: "border-green-500/30"
  },
  { 
    title: "Compliance Mapping", 
    icon: GitCompare,
    url: "/agents/compliance-mapping",
    dataKey: "complianceResults" as const,
    color: "from-orange-500/20 to-orange-500/5",
    borderColor: "border-orange-500/30"
  },
  { 
    title: "Auditor Assistant", 
    icon: ClipboardCheck,
    url: "/agents/auditor-assistant",
    dataKey: "auditReports" as const,
    color: "from-red-500/20 to-red-500/5",
    borderColor: "border-red-500/30"
  },
];

export default function PipelineOverviewPage() {
  const navigate = useNavigate();
  const pipeline = usePipeline();

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
              Monitor your compliance pipeline status and agent activity
            </p>
          </div>
          <Button onClick={() => pipeline.clearAll()} variant="outline" size="sm">
            Reset Pipeline
          </Button>
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

        {/* Pipeline Progress */}
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
            
            return (
              <Card 
                key={step.title}
                className={`relative cursor-pointer transition-all hover:shadow-md ${step.borderColor} ${isActive ? 'border-2' : 'border border-dashed'}`}
                onClick={() => navigate(step.url)}
              >
                <CardContent className={`pt-4 bg-gradient-to-br ${step.color} h-full`}>
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs font-mono">Step {index + 1}</span>
                    </div>
                    
                    <div className={`p-3 rounded-full ${isActive ? 'bg-primary/20' : 'bg-muted'}`}>
                      <step.icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
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
