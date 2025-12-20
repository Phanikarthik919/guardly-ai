import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipeline } from "@/contexts/PipelineContext";
import { useNavigate } from "react-router-dom";
import { 
  Radio, 
  FileText, 
  Receipt, 
  GitCompare, 
  ClipboardCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const agents = [
  { 
    title: "Regulation Monitoring", 
    description: "Fetch & index regulations from government portals",
    url: "/agents/regulation-monitor", 
    icon: Radio,
    step: 1,
    dataKey: "regulations" as const
  },
  { 
    title: "Legal Parsing", 
    description: "Convert regulations into machine-readable clauses",
    url: "/agents/legal-parser", 
    icon: FileText,
    step: 2,
    dataKey: "parsedClauses" as const
  },
  { 
    title: "Transaction Understanding", 
    description: "Extract and classify financial transaction details",
    url: "/agents/transaction-understanding", 
    icon: Receipt,
    step: 3,
    dataKey: "transactions" as const
  },
  { 
    title: "Compliance Mapping", 
    description: "Match transactions against legal frameworks",
    url: "/agents/compliance-mapping", 
    icon: GitCompare,
    step: 4,
    dataKey: "complianceResults" as const
  },
  { 
    title: "Auditor Assistant", 
    description: "Generate explainable reports with recommendations",
    url: "/agents/auditor-assistant", 
    icon: ClipboardCheck,
    step: 5,
    dataKey: "auditReports" as const
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const pipeline = usePipeline();

  const getDataCount = (dataKey: typeof agents[number]['dataKey']) => {
    return pipeline[dataKey]?.length || 0;
  };

  const totalItems = agents.reduce((acc, agent) => acc + getDataCount(agent.dataKey), 0);
  const completedSteps = agents.filter(agent => getDataCount(agent.dataKey) > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your compliance pipeline with AI-powered agents
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pipeline Progress</CardDescription>
              <CardTitle className="text-2xl">{completedSteps}/5 Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1">
                {agents.map((agent, i) => (
                  <div 
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      getDataCount(agent.dataKey) > 0 ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-2xl">{totalItems}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Across all pipeline stages
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compliance Status</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {pipeline.complianceResults.filter(r => r.status === 'compliant').length}
                <CheckCircle2 className="h-5 w-5 text-success" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compliant items
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Violations Found</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {pipeline.complianceResults.filter(r => r.status === 'violation').length}
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Requires attention
            </CardContent>
          </Card>
        </div>

        {/* Agent Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Agent Pipeline</h2>
            <Button variant="outline" size="sm" onClick={() => pipeline.clearAll()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Pipeline
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const count = getDataCount(agent.dataKey);
              const Icon = agent.icon;
              
              return (
                <Card 
                  key={agent.url}
                  className="group cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(agent.url)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="font-mono">
                        Step {agent.step}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{agent.title}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {count > 0 ? (
                          <span className="text-foreground font-medium">{count} items</span>
                        ) : (
                          <span className="text-muted-foreground">No data yet</span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 group-hover:text-primary">
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
