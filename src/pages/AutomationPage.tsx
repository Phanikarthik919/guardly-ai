import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePipeline } from "@/contexts/PipelineContext";
import {
  Play,
  CheckCircle,
  Loader2,
  ArrowRight,
  FileJson,
  AlertTriangle,
  ShieldCheck,
  Radio,
  FileText,
  Receipt,
  GitCompare,
  ClipboardCheck
} from "lucide-react";
import {
  sampleRegulations,
  sampleTransactions,
  runAgent2Simulation,
  runAgent4Simulation,
  runAgent5Simulation
} from "@/lib/automationData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type AgentStatus = "idle" | "running" | "complete" | "error";

interface AgentState {
  id: number;
  name: string;
  icon: any;
  status: AgentStatus;
  logs: string[];
  output: any;
  description: string;
}

export default function AutomationPage() {
  const {
    addRegulations,
    addParsedClauses,
    addTransactions,
    addComplianceResults,
    addAuditReport,
    clearAll
  } = usePipeline();

  const [agents, setAgents] = useState<AgentState[]>([
    { id: 1, name: "Regulation Monitoring", icon: Radio, status: "idle", logs: [], output: null, description: "Fetching latest regulations..." },
    { id: 2, name: "Legal Parsing", icon: FileText, status: "idle", logs: [], output: null, description: "Parsing regulations into rules..." },
    { id: 3, name: "Transaction Understanding", icon: Receipt, status: "idle", logs: [], output: null, description: "Extracting transaction data..." },
    { id: 4, name: "Compliance Mapping (CORE)", icon: GitCompare, status: "idle", logs: [], output: null, description: "Detecting violations..." },
    { id: 5, name: "Auditor Assistant", icon: ClipboardCheck, status: "idle", logs: [], output: null, description: "Generating audit reports..." },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(0);

  const updateAgent = (id: number, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const runAutomation = async () => {
    setIsRunning(true);
    setCompletedSteps(0);
    clearAll(); // Clear pipeline context

    // Reset agents
    setAgents(prev => prev.map(a => ({ ...a, status: "idle", logs: [], output: null })));

    try {
      // --- AGENT 1: Regulation Monitor ---
      updateAgent(1, { status: "running", logs: ["Connecting to Firestore 'regulations'...", "Querying categories: GST, Procurement...", "Filtering by date range..."] });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

      const regs = sampleRegulations;
      addRegulations(regs);

      const agent1Output = {
        regulations_fetched: regs.map(r => ({
          regulation_id: r.id,
          name: r.title,
          effective_date: r.date,
          clauses: 5, // mock
          source_url: r.source,
          last_updated: r.last_updated
        })),
        total_regulations: regs.length,
        agent_1_status: "COMPLETE"
      };

      updateAgent(1, {
        status: "complete",
        logs: ["Fetched 2 new regulations.", "Updates detected vs last fetch.", "Status: COMPLETE"],
        output: agent1Output
      });
      setCompletedSteps(1);


      // --- AGENT 2: Legal Parser ---
      updateAgent(2, { status: "running", logs: ["Receiving regulations from Agent 1...", "Analyzing document structure...", "Extracting compliance clauses...", "Identifying thresholds and rates..."] });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const clauses = runAgent2Simulation(regs);
      addParsedClauses(clauses);

      const agent2Output = {
        compliance_clauses: clauses,
        clauses_parsed: clauses.length,
        agent_2_status: "COMPLETE"
      };

      updateAgent(2, {
        status: "complete",
        logs: [`Parsed ${clauses.length} clauses.`, "Identified transaction types: procurement, construction.", "Extracted thresholds and tax rates.", "Status: COMPLETE"],
        output: agent2Output
      });
      setCompletedSteps(2);


      // --- AGENT 3: Transaction Understanding ---
      updateAgent(3, { status: "running", logs: ["Fetching new transactions from Firestore...", "Parsing attached documents (PDFs)...", "Validating data completeness...", "Extracting vendor details..."] });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const txns = sampleTransactions;
      addTransactions(txns);

      const agent3Output = {
        transaction_analysis: txns.map(t => ({
          transaction_id: t.id,
          amount: t.amount,
          vendor: t.vendor,
          category: t.category,
          tax: t.tax,
          date: t.date,
          description: t.description
        })),
        agent_3_status: "COMPLETE"
      };

      updateAgent(3, {
        status: "complete",
        logs: [`Processed ${txns.length} transactions.`, "Validated completeness: 85%", "Flagged 1 transaction with missing fields.", "Status: COMPLETE"],
        output: agent3Output
      });
      setCompletedSteps(3);


      // --- AGENT 4: Compliance Mapping (CORE) ---
      updateAgent(4, { status: "running", logs: ["Loading compliance clauses...", "Mapping transactions to rules...", "Checking TAX_MISMATCH...", "Checking BIDDING_REQUIREMENT...", "Checking MISSING_DOCUMENT..."] });
      await new Promise(resolve => setTimeout(resolve, 2500));

      const results = runAgent4Simulation(clauses, txns);
      addComplianceResults(results);

      const agent4Output = results; // Already in correct format

      updateAgent(4, {
        status: "complete",
        logs: [
          `Analyzed ${results.length} transactions.`,
          `Detected ${results.filter(r => r.status === "violation").length} violations.`,
          "Calculated risk scores.",
          "Status: COMPLETE"
        ],
        output: agent4Output
      });
      setCompletedSteps(4);


      // --- AGENT 5: Auditor Assistant ---
      updateAgent(5, { status: "running", logs: ["Fetching violation data...", "Generating audit reports...", "Prioritizing recommendations...", "Assigning deadlines..."] });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const reports = runAgent5Simulation(results, txns);
      reports.forEach(r => addAuditReport(r));

      const agent5Output = reports;

      updateAgent(5, {
        status: "complete",
        logs: [`Generated ${reports.length} audit reports.`, "Created actionable recommendations.", "Status: COMPLETE"],
        output: agent5Output
      });
      setCompletedSteps(5);

      setIsRunning(false);

    } catch (error) {
      console.error("Automation error:", error);
      setIsRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autonomous Compliance Pipeline</h1>
          <p className="text-muted-foreground">
            Master orchestration for all 5 compliance agents.
          </p>
        </div>
        <Button
          size="lg"
          onClick={runAutomation}
          disabled={isRunning}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          {isRunning ? "Running Automation..." : "Start Full Automation"}
        </Button>
      </div>

      <div className="grid gap-6">
        {agents.map((agent, index) => (
          <div key={agent.id} className="relative">
            {index < agents.length - 1 && (
              <div className="absolute left-6 top-16 bottom-[-24px] w-0.5 bg-border -z-10" />
            )}

            <Card className={`transition-all duration-300 ${
              agent.status === "running" ? "ring-2 ring-primary ring-offset-2" : ""
            }`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`
                      h-12 w-12 rounded-full flex items-center justify-center border
                      ${agent.status === "complete" ? "bg-green-100 border-green-200 text-green-600" :
                        agent.status === "running" ? "bg-primary/10 border-primary/20 text-primary" :
                        "bg-secondary border-border text-muted-foreground"}
                    `}>
                      {agent.status === "running" ? <Loader2 className="h-6 w-6 animate-spin" /> :
                       agent.status === "complete" ? <CheckCircle className="h-6 w-6" /> :
                       <agent.icon className="h-6 w-6" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Agent {agent.id}: {agent.name}
                        {agent.status === "complete" && <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>}
                      </CardTitle>
                      <CardDescription>{agent.description}</CardDescription>
                    </div>
                  </div>
                  {agent.status !== "idle" && (
                     <div className="text-sm text-muted-foreground font-mono">
                        Status: {agent.status.toUpperCase()}
                     </div>
                  )}
                </div>
              </CardHeader>

              {(agent.status === "running" || agent.status === "complete") && (
                <CardContent>
                   <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Processing Logs</div>
                        <div className="bg-black/90 text-green-400 font-mono text-xs p-4 rounded-lg min-h-[120px] shadow-inner">
                           {agent.logs.map((log, i) => (
                             <div key={i} className="mb-1">&gt; {log}</div>
                           ))}
                           {agent.status === "running" && <span className="animate-pulse">_</span>}
                        </div>
                      </div>

                      {agent.output && (
                        <div className="space-y-4">
                          <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center justify-between">
                            <span>Agent Output (JSON)</span>
                            <FileJson className="h-4 w-4" />
                          </div>
                          <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/30">
                            <pre className="text-xs font-mono text-foreground leading-relaxed">
                              {JSON.stringify(agent.output, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                   </div>
                </CardContent>
              )}
            </Card>

            {index < agents.length - 1 && (
               <div className="flex justify-center my-2">
                  <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
               </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
