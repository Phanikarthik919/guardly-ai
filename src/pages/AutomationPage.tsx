import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  CheckCircle,
  Loader2,
  ArrowRight,
  FileJson,
  Radio,
  FileText,
  Receipt,
  GitCompare,
  ClipboardCheck,
  Download
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
import { jsPDF } from "jspdf";

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
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 1, name: "Regulation Monitoring", icon: Radio, status: "idle", logs: [], output: null, description: "Fetching latest regulations..." },
    { id: 2, name: "Legal Parsing", icon: FileText, status: "idle", logs: [], output: null, description: "Parsing regulations into rules..." },
    { id: 3, name: "Transaction Understanding", icon: Receipt, status: "idle", logs: [], output: null, description: "Extracting transaction data..." },
    { id: 4, name: "Compliance Mapping (CORE)", icon: GitCompare, status: "idle", logs: [], output: null, description: "Detecting violations..." },
    { id: 5, name: "Auditor Assistant", icon: ClipboardCheck, status: "idle", logs: [], output: null, description: "Generating audit reports..." },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateAgent = (id: number, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const generatePDF = (reports: any[]) => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(20);
    doc.text("Audit Report Summary", 20, yPos);
    yPos += 15;

    reports.forEach((report, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(report.status === "VIOLATION" ? 220 : 0, 0, 0);
      doc.text(`Report: ${report.report_id}`, 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Transaction: ${report.transaction_id}`, 20, yPos);
      yPos += 6;
      doc.text(`Risk Score: ${(report.risk_score * 100).toFixed(0)}%`, 20, yPos);
      yPos += 6;
      doc.text(`Summary: ${report.summary}`, 20, yPos, { maxWidth: 170 });
      yPos += 20;

      if (report.recommendations && report.recommendations.length > 0) {
        doc.text("Recommendations:", 25, yPos);
        yPos += 6;
        report.recommendations.forEach((rec: any) => {
           doc.text(`- [${rec.priority}] ${rec.action} (By: ${rec.deadline})`, 30, yPos);
           yPos += 6;
        });
        yPos += 10;
      }
    });

    doc.save("compliance_audit_report.pdf");
  };

  const runAutomation = async () => {
    setIsRunning(true);

    // Reset agents
    setAgents(prev => prev.map(a => ({ ...a, status: "idle", logs: [], output: null })));

    try {
      // --- AGENT 1: Regulation Monitor ---
      updateAgent(1, { status: "running", logs: ["Connecting to Firestore 'regulations'...", "Querying categories: GST, Procurement...", "Filtering by date range..."] });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

      const regs = sampleRegulations;

      const agent1Output = {
        regulations_fetched: regs.map(r => ({
          regulation_id: r.regulation_id,
          name: r.name,
          effective_date: r.effective_date,
          clauses: r.clauses,
          source_url: r.source_url,
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


      // --- AGENT 2: Legal Parser ---
      updateAgent(2, { status: "running", logs: ["Receiving regulations from Agent 1...", "Analyzing document structure...", "Extracting compliance clauses...", "Identifying thresholds and rates..."] });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const clauses = runAgent2Simulation(regs);

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


      // --- AGENT 3: Transaction Understanding ---
      updateAgent(3, { status: "running", logs: ["Fetching new transactions from Firestore...", "Parsing attached documents (PDFs)...", "Validating data completeness...", "Extracting vendor details..."] });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const txns = sampleTransactions;

      const agent3Output = {
        transaction_analysis: txns.map(t => ({
          transaction_id: t.transaction_id,
          amount: t.amount,
          vendor_name: t.vendor_name,
          category: t.category,
          tax_paid: t.tax_paid,
          bids_count: t.bids_count,
          documents_attached: t.documents_attached,
          data_completeness: t.data_completeness,
          missing_fields: t.missing_fields
        })),
        agent_3_status: "COMPLETE"
      };

      updateAgent(3, {
        status: "complete",
        logs: [`Processed ${txns.length} transactions.`, "Validated completeness: 85%", "Flagged 1 transaction with missing fields.", "Status: COMPLETE"],
        output: agent3Output
      });


      // --- AGENT 4: Compliance Mapping (CORE) ---
      updateAgent(4, { status: "running", logs: ["Loading compliance clauses...", "Mapping transactions to rules...", "Checking TAX_MISMATCH...", "Checking BIDDING_REQUIREMENT...", "Checking MISSING_DOCUMENT..."] });
      await new Promise(resolve => setTimeout(resolve, 2500));

      const results = runAgent4Simulation(clauses, txns);

      const agent4Output = results;

      updateAgent(4, {
        status: "complete",
        logs: [
          `Analyzed ${results.length} transactions.`,
          `Detected ${results.filter(r => r.compliance_status === "VIOLATION").length} violations.`,
          "Calculated risk scores.",
          "Status: COMPLETE"
        ],
        output: agent4Output
      });


      // --- AGENT 5: Auditor Assistant ---
      updateAgent(5, { status: "running", logs: ["Fetching violation data...", "Generating audit reports...", "Prioritizing recommendations...", "Assigning deadlines..."] });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const reports = runAgent5Simulation(results, txns);

      const agent5Output = reports;

      updateAgent(5, {
        status: "complete",
        logs: [`Generated ${reports.length} audit reports.`, "Created actionable recommendations.", "Status: COMPLETE"],
        output: agent5Output
      });

      setIsRunning(false);

    } catch (error) {
      console.error("Automation error:", error);
      setIsRunning(false);
    }
  };

  const isComplete = agents.every(a => a.status === "complete");
  const agent5Output = agents.find(a => a.id === 5)?.output;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autonomous Compliance Pipeline</h1>
          <p className="text-muted-foreground">
            Master orchestration for all 5 compliance agents.
          </p>
        </div>
        <div className="flex gap-2">
            {isComplete && agent5Output && (
                <Button
                    variant="outline"
                    onClick={() => generatePDF(agent5Output)}
                    className="gap-2"
                >
                    <Download className="h-4 w-4" />
                    Download Audit PDF
                </Button>
            )}
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
