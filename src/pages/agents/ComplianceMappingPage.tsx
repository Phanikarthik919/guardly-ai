import { useState } from "react";
import { GitCompare, Loader2, Sparkles, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipeline, ComplianceResult } from "@/contexts/PipelineContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ComplianceStatsCards } from "@/components/agents/ComplianceStatsCards";
import { ComplianceResultModal } from "@/components/agents/ComplianceResultModal";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";

export default function ComplianceMappingPage() {
  const { 
    transactions, 
    parsedClauses, 
    complianceResults, 
    addComplianceResults,
  } = usePipeline();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<ComplianceResult | null>(null);
  const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });
  const [currentCheck, setCurrentCheck] = useState<string>('');

  const { response, isLoading, runAgent, clearResponse } = useStreamingAgent({
    onComplete: () => {}
  });

  const parseAIResponse = (aiResponse: string, transactionId: string, clauseId: string): ComplianceResult => {
    const lowerResponse = aiResponse.toLowerCase();
    
    let status: ComplianceResult['status'] = 'warning';
    if (lowerResponse.includes('compliant') && !lowerResponse.includes('non-compliant') && !lowerResponse.includes('not compliant')) {
      status = 'compliant';
    } else if (lowerResponse.includes('violation') || lowerResponse.includes('non-compliant') || lowerResponse.includes('not compliant')) {
      status = 'violation';
    } else if (lowerResponse.includes('missing') && lowerResponse.includes('document')) {
      status = 'missing_docs';
    }

    let riskLevel: ComplianceResult['riskLevel'] = 'medium';
    if (lowerResponse.includes('high risk') || lowerResponse.includes('critical') || lowerResponse.includes('severe')) {
      riskLevel = 'high';
    } else if (lowerResponse.includes('low risk') || lowerResponse.includes('minor') || lowerResponse.includes('compliant')) {
      riskLevel = 'low';
    }

    return {
      id: crypto.randomUUID(),
      transactionId,
      clauseId,
      status,
      riskLevel,
      reasoning: aiResponse.slice(0, 500) || 'Compliance analysis completed based on regulatory framework.',
      missingDocs: status === 'missing_docs' ? ['Supporting documentation required'] : undefined
    };
  };

  const handleCheckCompliance = async () => {
    if (selectedTxIds.length === 0 || selectedClauseIds.length === 0) {
      toast({ 
        title: "Please select transactions and clauses to check", 
        variant: "destructive" 
      });
      return;
    }

    const selectedTxs = transactions.filter(t => selectedTxIds.includes(t.id));
    const selectedClauses = parsedClauses.filter(c => selectedClauseIds.includes(c.id));
    const total = selectedTxs.length * selectedClauses.length;
    setProcessingCount({ current: 0, total });

    clearResponse();
    const results: ComplianceResult[] = [];

    for (const tx of selectedTxs) {
      for (const clause of selectedClauses) {
        setProcessingCount(prev => ({ ...prev, current: prev.current + 1 }));
        setCurrentCheck(`${tx.vendor} → ${clause.clauseId}`);
        
        let aiResponse = '';
        try {
          aiResponse = await runAgent('agent-compliance-mapping', {
            transaction: {
              id: tx.id,
              category: tx.category,
              amount: tx.amount,
              tax: tx.tax,
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
        } catch (err) {
          aiResponse = 'Unable to complete automated compliance check. Manual review required.';
        }

        const result = parseAIResponse(aiResponse || response, tx.id, clause.id);
        results.push(result);
        addComplianceResults([result]);
      }
    }

    setSelectedTxIds([]);
    setSelectedClauseIds([]);
    setProcessingCount({ current: 0, total: 0 });
    setCurrentCheck('');
    
    const violations = results.filter(r => r.status === 'violation').length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    toast({ 
      title: "Compliance check completed",
      description: `${results.length} checks: ${compliant} compliant, ${violations} violations`
    });
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
        return tx ? `${tx.vendor}` : item.transactionId.slice(0, 8);
      }
    },
    { 
      key: "clauseId", 
      header: "Clause",
      render: (item: ComplianceResult) => {
        const clause = parsedClauses.find(c => c.id === item.clauseId);
        return <span className="font-mono text-xs">{clause?.clauseId || item.clauseId.slice(0, 8)}</span>;
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
      key: "actions", 
      header: "",
      render: (item: ComplianceResult) => (
        <Button variant="ghost" size="icon" onClick={(e) => {
          e.stopPropagation();
          setSelectedResult(item);
        }}>
          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )
    },
  ];

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
        <Card className="border-dashed">
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
            <ComplianceStatsCards results={complianceResults} />
          )}

          {/* AI Processing Indicator */}
          {isLoading && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Processing compliance check {processingCount.current} of {processingCount.total}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {response || "Analyzing transaction against regulatory clause..."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg">Select Transactions</CardTitle>
                <CardDescription>
                  {transactions.length} available from Transaction Understanding
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <DataTable 
                  data={transactions} 
                  columns={txColumns}
                  selectable
                  selectedIds={selectedTxIds}
                  onSelectionChange={setSelectedTxIds}
                />
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-transparent">
                <CardTitle className="text-lg">Select Clauses</CardTitle>
                <CardDescription>
                  {parsedClauses.length} available from Legal Parsing
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
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
              disabled={isLoading || selectedTxIds.length === 0 || selectedClauseIds.length === 0}
              className="min-w-[280px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking Compliance...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Check Compliance ({selectedTxIds.length} × {selectedClauseIds.length})
                </>
              )}
            </Button>
          </div>

          <Card>
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="text-lg">Compliance Results ({complianceResults.length})</CardTitle>
              <CardDescription>
                Violations, missing documentation, and risk flags
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable 
                data={complianceResults} 
                columns={resultColumns}
                emptyMessage="No compliance checks run yet. Select transactions and clauses above."
              />
            </CardContent>
          </Card>
        </div>
      )}

      <ComplianceResultModal
        result={selectedResult}
        transaction={selectedResult ? transactions.find(t => t.id === selectedResult.transactionId) || null : null}
        clause={selectedResult ? parsedClauses.find(c => c.id === selectedResult.clauseId) || null : null}
        open={!!selectedResult}
        onOpenChange={(open) => !open && setSelectedResult(null)}
      />
    </DashboardLayout>
  );
}
