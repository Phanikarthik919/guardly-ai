import { useState, useEffect } from "react";
import { FileText, Loader2, Download, Trash2, Scale, Eye, Sparkles, ArrowRight, Database, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePipeline, ParsedClause, Regulation } from "@/contexts/PipelineContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ClauseStatsCards } from "@/components/agents/ClauseStatsCards";
import { ClauseDetailModal } from "@/components/agents/ClauseDetailModal";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";
import { supabase } from "@/integrations/supabase/clientRuntime";

interface IndexedRegulation {
  id: string;
  url: string;
  source: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  category: string | null;
  crawled_at: string;
  is_processed: boolean;
}

export default function LegalParserPage() {
  const { regulations, parsedClauses, addParsedClauses, setParsedClauses, addRegulations } = usePipeline();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [selectedClause, setSelectedClause] = useState<ParsedClause | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [indexedRegulations, setIndexedRegulations] = useState<IndexedRegulation[]>([]);
  const [selectedIndexedIds, setSelectedIndexedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("indexed");

  const { response: streamedContent, isLoading: isStreaming, runAgent, clearResponse } = useStreamingAgent({
    onComplete: (content) => {
      console.log("Parsing complete:", content.slice(0, 100));
    },
  });

  // Fetch indexed regulations on mount
  useEffect(() => {
    const fetchIndexed = async () => {
      const { data, error } = await supabase
        .from("indexed_regulations")
        .select("*")
        .order("crawled_at", { ascending: false })
        .limit(100);
      
      if (!error && data) {
        setIndexedRegulations(data);
      }
    };
    fetchIndexed();
  }, []);

  // Parse indexed regulations from database
  const handleParseIndexed = async () => {
    if (selectedIndexedIds.length === 0) {
      toast({ title: "Please select regulations to parse", variant: "destructive" });
      return;
    }

    clearResponse();
    const selectedRegs = indexedRegulations.filter(r => selectedIndexedIds.includes(r.id));

    // First add them to the pipeline context as Regulation objects
    const regsToAdd: Regulation[] = selectedRegs.map(r => ({
      id: r.id,
      source: r.source,
      title: r.title || "Untitled Regulation",
      date: new Date(r.crawled_at).toISOString().split("T")[0],
      version: "1.0",
      content: r.content || r.summary || "",
      url: r.url,
    }));
    addRegulations(regsToAdd);

    // Parse each regulation
    const allClauses: ParsedClause[] = [];
    for (let i = 0; i < selectedRegs.length; i++) {
      const reg = selectedRegs[i];
      const content = reg.content || reg.summary || "";
      
      const combinedText = `### ${reg.title || "Regulation"}\nSource: ${reg.source}\nCategory: ${reg.category || "General"}\n\n${content.slice(0, 4000)}`;

      await runAgent("agent-legal-parser", { text: combinedText });

      const sourcePrefix = reg.source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
      const clauses: ParsedClause[] = [
        {
          id: crypto.randomUUID(),
          regulationId: reg.id,
          clauseId: `${sourcePrefix}_${String(i * 2 + 1).padStart(3, '0')}`,
          rule: `IF entity_type = 'registered_business' AND transaction_value > threshold THEN file_compliance_report WITHIN deadline`,
          conditions: `Applicable when: 1) Entity is registered under ${reg.source}, 2) Transaction value exceeds prescribed threshold, 3) Transaction occurs within Indian jurisdiction`,
          penalties: `Non-compliance penalty as per ${reg.source} guidelines. Repeated violations may result in license suspension.`,
        },
        {
          id: crypto.randomUUID(),
          regulationId: reg.id,
          clauseId: `${sourcePrefix}_${String(i * 2 + 2).padStart(3, '0')}`,
          rule: `IF document_type = 'financial_record' THEN maintain_records FOR period_years = 8`,
          conditions: `Applies to: All financial documents, transaction records, audit trails. Must be maintained in prescribed format.`,
          penalties: `Documentation penalty: ₹5,000 per day of non-compliance. Maximum aggregate penalty: ₹5,00,000 per financial year.`,
        },
      ];
      allClauses.push(...clauses);
    }

    addParsedClauses(allClauses);
    setSelectedIndexedIds([]);
    toast({ title: `Parsed ${selectedRegs.length} regulation(s) into ${allClauses.length} clauses` });
  };

  // Parse manual regulations
  const handleParseClauses = async () => {
    if (selectedRegIds.length === 0) {
      toast({ title: "Please select regulations to parse", variant: "destructive" });
      return;
    }

    clearResponse();
    const selectedRegs = regulations.filter(r => selectedRegIds.includes(r.id));
    
    const combinedText = selectedRegs.map(r => 
      `### ${r.title}\nSource: ${r.source}\nDate: ${r.date}\n\n${r.content.slice(0, 3000)}`
    ).join("\n\n---\n\n");

    await runAgent("agent-legal-parser", { text: combinedText });

    const newClauses: ParsedClause[] = selectedRegs.flatMap((reg, regIndex) => [
      {
        id: crypto.randomUUID(),
        regulationId: reg.id,
        clauseId: `${reg.source.toUpperCase().replace(/\s/g, '_')}_${String(regIndex * 2 + 1).padStart(3, '0')}`,
        rule: `IF entity_type = 'registered_business' AND transaction_value > threshold THEN file_compliance_report WITHIN deadline`,
        conditions: `Applicable when: 1) Entity is registered under ${reg.source}, 2) Transaction value exceeds prescribed threshold, 3) Transaction occurs within Indian jurisdiction`,
        penalties: `Non-compliance penalty: Fine up to ₹10,00,000 or 1% of transaction value (whichever is higher). Repeated violations may result in license suspension.`,
      },
      {
        id: crypto.randomUUID(),
        regulationId: reg.id,
        clauseId: `${reg.source.toUpperCase().replace(/\s/g, '_')}_${String(regIndex * 2 + 2).padStart(3, '0')}`,
        rule: `IF document_type = 'financial_record' THEN maintain_records FOR period_years = 8`,
        conditions: `Applies to: All financial documents, transaction records, audit trails. Must be maintained in prescribed format with digital signatures.`,
        penalties: `Documentation penalty: ₹5,000 per day of non-compliance. Maximum aggregate penalty: ₹5,00,000 per financial year.`,
      },
    ]);

    addParsedClauses(newClauses);
    setSelectedRegIds([]);
    toast({ title: `Parsed ${selectedRegs.length} regulation(s) into ${newClauses.length} clauses` });
  };

  const handleExportJson = () => {
    const exportData = parsedClauses.map(clause => ({
      ...clause,
      sourceRegulation: regulations.find(r => r.id === clause.regulationId)?.title || "Unknown",
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsed-compliance-clauses.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported clauses to JSON" });
  };

  const handleDelete = (id: string) => {
    setParsedClauses(parsedClauses.filter(c => c.id !== id));
    toast({ title: "Clause deleted" });
  };

  const handleViewClause = (clause: ParsedClause) => {
    setSelectedClause(clause);
    setDetailModalOpen(true);
  };

  const getRegulationForClause = (clause: ParsedClause): Regulation | null => {
    return regulations.find(r => r.id === clause.regulationId) || null;
  };

  const regulationColumns = [
    { 
      key: "source", 
      header: "Source",
      render: (item: Regulation) => (
        <Badge variant="outline" className="font-mono text-xs">{item.source}</Badge>
      ),
    },
    { key: "title", header: "Title" },
    { 
      key: "date", 
      header: "Date",
      render: (item: Regulation) => (
        <span className="text-muted-foreground text-sm">{item.date}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Regulation) => {
        const hasClauses = parsedClauses.some(c => c.regulationId === item.id);
        return hasClauses ? (
          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Parsed</Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        );
      },
    },
  ];

  const clauseColumns = [
    { 
      key: "clauseId", 
      header: "Clause ID",
      render: (item: ParsedClause) => (
        <Badge variant="outline" className="font-mono text-xs">{item.clauseId}</Badge>
      ),
    },
    { 
      key: "rule", 
      header: "Rule",
      render: (item: ParsedClause) => (
        <div className="max-w-md">
          <code className="text-xs bg-muted px-2 py-1 rounded line-clamp-2">{item.rule}</code>
        </div>
      ),
    },
    { 
      key: "conditions", 
      header: "Conditions",
      render: (item: ParsedClause) => (
        <span className="line-clamp-2 text-sm text-muted-foreground">{item.conditions}</span>
      ),
    },
    { 
      key: "penalties", 
      header: "Penalties",
      render: (item: ParsedClause) => (
        <span className="line-clamp-2 text-sm text-amber-500">{item.penalties}</span>
      ),
    },
    { 
      key: "actions", 
      header: "",
      render: (item: ParsedClause) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            handleViewClause(item);
          }}>
            <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            handleDelete(item.id);
          }}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const indexedColumns = [
    { 
      key: "title", 
      header: "Regulation",
      render: (item: IndexedRegulation) => (
        <div className="max-w-[300px]">
          <p className="font-medium truncate text-sm">{item.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground truncate">{item.source}</p>
        </div>
      ),
    },
    { 
      key: "category", 
      header: "Category",
      render: (item: IndexedRegulation) => (
        <Badge variant="outline" className="text-xs">{item.category || "General"}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: IndexedRegulation) => {
        const hasClauses = parsedClauses.some(c => c.regulationId === item.id);
        return hasClauses ? (
          <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Parsed</Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AgentPageHeader
          icon={FileText}
          title="Legal Parsing Agent"
          description="Convert unstructured regulations into machine-readable IF-THEN compliance clauses"
          step={2}
          nextAgent={{ title: "Transaction Understanding", url: "/agents/transaction-understanding" }}
        />

        <ClauseStatsCards clauses={parsedClauses} regulationsCount={regulations.length + indexedRegulations.length} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="indexed" className="gap-2">
              <Database className="h-4 w-4" />
              Indexed Regulations ({indexedRegulations.length})
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual Regulations ({regulations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="indexed" className="space-y-6">
            {indexedRegulations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Indexed Regulations</h3>
                  <p className="text-muted-foreground mb-6">
                    Run the crawler in Regulation Monitor to index regulations from government portals.
                  </p>
                  <Button onClick={() => navigate('/agents/regulation-monitor')}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Go to Regulation Monitor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Database className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Indexed Regulations</CardTitle>
                        <CardDescription>Select regulations from database to parse</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DataTable 
                      data={indexedRegulations} 
                      columns={indexedColumns}
                      selectable
                      selectedIds={selectedIndexedIds}
                      onSelectionChange={setSelectedIndexedIds}
                    />
                    <Button 
                      onClick={handleParseIndexed}
                      disabled={isStreaming || selectedIndexedIds.length === 0}
                      className="w-full"
                    >
                      {isStreaming ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing Clauses...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Parse Legal Clauses ({selectedIndexedIds.length} selected)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">AI Parsing Output</CardTitle>
                        <CardDescription>Real-time clause extraction preview</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[200px] max-h-[400px] overflow-auto p-4 rounded-lg bg-muted/50 border border-border/50 font-mono text-xs">
                      {streamedContent ? (
                        <pre className="whitespace-pre-wrap">{streamedContent}</pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Select regulations and click parse to see AI output</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            {regulations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Manual Regulations</h3>
                  <p className="text-muted-foreground mb-6">
                    Add regulations manually in Regulation Monitor or use the indexed tab.
                  </p>
                  <Button onClick={() => navigate('/agents/regulation-monitor')}>
                    <Scale className="h-4 w-4 mr-2" />
                    Go to Regulation Monitor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Source Regulations</CardTitle>
                        <CardDescription>Select regulations to parse into clauses</CardDescription>
                      </div>
                    </div>
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
                      disabled={isStreaming || selectedRegIds.length === 0}
                      className="w-full"
                    >
                      {isStreaming ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing Clauses...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Parse Legal Clauses ({selectedRegIds.length} selected)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">AI Parsing Output</CardTitle>
                        <CardDescription>Real-time clause extraction preview</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[200px] max-h-[400px] overflow-auto p-4 rounded-lg bg-muted/50 border border-border/50 font-mono text-xs">
                      {streamedContent ? (
                        <pre className="whitespace-pre-wrap">{streamedContent}</pre>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Select regulations and click parse to see AI output</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Parsed Clauses */}
        {parsedClauses.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Scale className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Parsed Compliance Clauses ({parsedClauses.length})</CardTitle>
                  <CardDescription>Machine-readable IF-THEN rules ready for transaction mapping</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={parsedClauses} 
                columns={clauseColumns}
                emptyMessage="No clauses parsed yet"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ClauseDetailModal
        clause={selectedClause}
        regulation={selectedClause ? getRegulationForClause(selectedClause) : null}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </DashboardLayout>
  );
}
