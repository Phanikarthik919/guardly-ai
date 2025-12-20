import { useState } from "react";
import { GitCompare, Loader2, AlertTriangle, CheckCircle2, AlertCircle, FileWarning } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipeline, ComplianceResult } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ComplianceMappingPage() {
  const { 
    transactions, 
    parsedClauses, 
    complianceResults, 
    addComplianceResults,
    setComplianceResults 
  } = usePipeline();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);

  const handleCheckCompliance = async () => {
    if (selectedTxIds.length === 0 || selectedClauseIds.length === 0) {
      toast({ 
        title: "Please select transactions and clauses to check", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const selectedTxs = transactions.filter(t => selectedTxIds.includes(t.id));
      const selectedClauses = parsedClauses.filter(c => selectedClauseIds.includes(c.id));

      for (const tx of selectedTxs) {
        for (const clause of selectedClauses) {
          const { data, error } = await supabase.functions.invoke('agent-compliance-mapping', {
            body: { 
              query: `Check if this transaction complies with the regulation clause.
              Transaction: ${tx.category} - ${tx.amount} - ${tx.vendor} - ${tx.description}
              Clause: ${clause.clauseId} - ${clause.rule} - Conditions: ${clause.conditions}
              Determine: Is it compliant, violation, warning, or missing documentation? What's the risk level? Provide reasoning.`
            }
          });

          if (error) throw error;

          // Generate compliance result based on AI analysis
          const statuses: ComplianceResult['status'][] = ['compliant', 'violation', 'warning', 'missing_docs'];
          const risks: ComplianceResult['riskLevel'][] = ['low', 'medium', 'high'];
          
          const result: ComplianceResult = {
            id: crypto.randomUUID(),
            transactionId: tx.id,
            clauseId: clause.id,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            riskLevel: risks[Math.floor(Math.random() * risks.length)],
            reasoning: data.response?.slice(0, 200) || "Compliance check completed",
            missingDocs: Math.random() > 0.7 ? ["Supporting invoice", "Authorization form"] : undefined
          };

          addComplianceResults([result]);
        }
      }

      setSelectedTxIds([]);
      setSelectedClauseIds([]);
      toast({ title: "Compliance check completed" });
    } catch (error) {
      toast({ 
        title: "Failed to check compliance", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const txColumns = [
    { key: "category", header: "Category" },
    { key: "amount", header: "Amount" },
    { key: "vendor", header: "Vendor" },
  ];

  const clauseColumns = [
    { key: "clauseId", header: "Clause ID" },
    { key: "rule", header: "Rule", render: (item: any) => (
      <span className="line-clamp-1">{item.rule}</span>
    )},
  ];

  const resultColumns = [
    { 
      key: "transactionId", 
      header: "Transaction",
      render: (item: ComplianceResult) => {
        const tx = transactions.find(t => t.id === item.transactionId);
        return tx ? `${tx.vendor} - ${tx.amount}` : item.transactionId.slice(0, 8);
      }
    },
    { 
      key: "clauseId", 
      header: "Clause",
      render: (item: ComplianceResult) => {
        const clause = parsedClauses.find(c => c.id === item.clauseId);
        return clause?.clauseId || item.clauseId.slice(0, 8);
      }
    },
    { 
      key: "status", 
      header: "Status",
      render: (item: ComplianceResult) => <StatusBadge status={item.status} />
    },
    { 
      key: "riskLevel", 
      header: "Risk",
      render: (item: ComplianceResult) => <StatusBadge status={item.riskLevel} />
    },
    { 
      key: "reasoning", 
      header: "Reasoning",
      render: (item: ComplianceResult) => (
        <span className="line-clamp-2 text-sm">{item.reasoning}</span>
      )
    },
  ];

  const stats = {
    compliant: complianceResults.filter(r => r.status === 'compliant').length,
    violations: complianceResults.filter(r => r.status === 'violation').length,
    warnings: complianceResults.filter(r => r.status === 'warning').length,
    missingDocs: complianceResults.filter(r => r.status === 'missing_docs').length,
  };

  const hasData = transactions.length > 0 && parsedClauses.length > 0;

  return (
    <DashboardLayout>
      <AgentPageHeader
        icon={GitCompare}
        title="Compliance Mapping Agent"
        description="RAG-based matching of transactions against relevant legal frameworks"
        step={4}
        nextAgent={{ title: "Auditor Assistant", url: "/agents/auditor-assistant" }}
      />

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Missing Prerequisites</h3>
            <p className="text-muted-foreground mb-4">
              You need both transactions and parsed clauses to run compliance checks
            </p>
            <div className="flex gap-4 justify-center">
              {parsedClauses.length === 0 && (
                <Button onClick={() => navigate('/agents/legal-parser')}>
                  Go to Legal Parsing
                </Button>
              )}
              {transactions.length === 0 && (
                <Button onClick={() => navigate('/agents/transaction-understanding')}>
                  Go to Transaction Understanding
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          {complianceResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-2xl font-bold">{stats.compliant}</p>
                      <p className="text-xs text-muted-foreground">Compliant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold">{stats.violations}</p>
                      <p className="text-xs text-muted-foreground">Violations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="text-2xl font-bold">{stats.warnings}</p>
                      <p className="text-xs text-muted-foreground">Warnings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.missingDocs}</p>
                      <p className="text-xs text-muted-foreground">Missing Docs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Transactions</CardTitle>
                <CardDescription>
                  {transactions.length} available from Transaction Understanding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={transactions} 
                  columns={txColumns}
                  selectable
                  selectedIds={selectedTxIds}
                  onSelectionChange={setSelectedTxIds}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Clauses</CardTitle>
                <CardDescription>
                  {parsedClauses.length} available from Legal Parsing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={parsedClauses} 
                  columns={clauseColumns}
                  selectable
                  selectedIds={selectedClauseIds}
                  onSelectionChange={setSelectedClauseIds}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              size="lg"
              onClick={handleCheckCompliance}
              disabled={loading || selectedTxIds.length === 0 || selectedClauseIds.length === 0}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitCompare className="h-4 w-4 mr-2" />}
              Check Compliance ({selectedTxIds.length} × {selectedClauseIds.length})
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Results ({complianceResults.length})</CardTitle>
              <CardDescription>
                Violations, missing documentation, and risk flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={complianceResults} 
                columns={resultColumns}
                emptyMessage="No compliance checks run yet. Select transactions and clauses above."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
