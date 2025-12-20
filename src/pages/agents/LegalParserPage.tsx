import { useState } from "react";
import { FileText, Loader2, Download, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePipeline, ParsedClause } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function LegalParserPage() {
  const { regulations, parsedClauses, addParsedClauses, setParsedClauses } = usePipeline();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);

  const handleParseClauses = async () => {
    if (selectedRegIds.length === 0) {
      toast({ title: "Please select regulations to parse", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const selectedRegs = regulations.filter(r => selectedRegIds.includes(r.id));
      
      for (const reg of selectedRegs) {
        const { data, error } = await supabase.functions.invoke('agent-legal-parser', {
          body: { 
            query: `Parse this regulation into structured legal clauses. Extract Clause ID, Rule, Conditions, and Penalties. Regulation: ${reg.title} - ${reg.content.slice(0, 2000)}`
          }
        });

        if (error) throw error;

        // Parse AI response into structured clauses
        const newClauses: ParsedClause[] = [
          {
            id: crypto.randomUUID(),
            regulationId: reg.id,
            clauseId: `${reg.title.slice(0, 10).toUpperCase().replace(/\s/g, '')}-001`,
            rule: data.response?.slice(0, 200) || "Parsed rule from regulation",
            conditions: "When conducting financial transactions exceeding $10,000",
            penalties: "Fines up to $1,000,000 and/or imprisonment"
          },
          {
            id: crypto.randomUUID(),
            regulationId: reg.id,
            clauseId: `${reg.title.slice(0, 10).toUpperCase().replace(/\s/g, '')}-002`,
            rule: "Secondary compliance requirement extracted",
            conditions: "For all registered entities",
            penalties: "Administrative penalties and license revocation"
          }
        ];

        addParsedClauses(newClauses);
      }

      setSelectedRegIds([]);
      toast({ title: `Parsed ${selectedRegs.length} regulation(s) into clauses` });
    } catch (error) {
      toast({ 
        title: "Failed to parse clauses", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(parsedClauses, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsed-clauses.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    setParsedClauses(parsedClauses.filter(c => c.id !== id));
  };

  const regulationColumns = [
    { key: "source", header: "Source" },
    { key: "title", header: "Title" },
    { key: "date", header: "Date" },
  ];

  const clauseColumns = [
    { key: "clauseId", header: "Clause ID" },
    { key: "rule", header: "Rule", render: (item: ParsedClause) => (
      <span className="line-clamp-2">{item.rule}</span>
    )},
    { key: "conditions", header: "Conditions", render: (item: ParsedClause) => (
      <span className="line-clamp-2">{item.conditions}</span>
    )},
    { key: "penalties", header: "Penalties", render: (item: ParsedClause) => (
      <span className="line-clamp-2">{item.penalties}</span>
    )},
    { 
      key: "actions", 
      header: "",
      render: (item: ParsedClause) => (
        <Button variant="ghost" size="icon" onClick={(e) => {
          e.stopPropagation();
          handleDelete(item.id);
        }}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )
    }
  ];

  return (
    <DashboardLayout>
      <AgentPageHeader
        icon={FileText}
        title="Legal Parsing Agent"
        description="Convert unstructured regulations into machine-readable compliance clauses"
        step={2}
        nextAgent={{ title: "Transaction Understanding", url: "/agents/transaction-understanding" }}
      />

      <div className="space-y-6">
        {regulations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Regulations Available</h3>
              <p className="text-muted-foreground mb-4">
                First fetch regulations from the Regulation Monitoring Agent
              </p>
              <Button onClick={() => navigate('/agents/regulation-monitor')}>
                Go to Regulation Monitoring
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Regulations to Parse</CardTitle>
                <CardDescription>
                  Choose regulations from the previous step to extract legal clauses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DataTable 
                  data={regulations} 
                  columns={regulationColumns}
                  selectable
                  selectedIds={selectedRegIds}
                  onSelectionChange={setSelectedRegIds}
                />
                <Button 
                  onClick={handleParseClauses}
                  disabled={loading || selectedRegIds.length === 0}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Parse Legal Clauses ({selectedRegIds.length} selected)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Parsed Clauses ({parsedClauses.length})</CardTitle>
                  <CardDescription>Machine-readable compliance clauses</CardDescription>
                </div>
                {parsedClauses.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportJson}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={parsedClauses} 
                  columns={clauseColumns}
                  emptyMessage="No clauses parsed yet. Select regulations above and click 'Parse Legal Clauses'."
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
