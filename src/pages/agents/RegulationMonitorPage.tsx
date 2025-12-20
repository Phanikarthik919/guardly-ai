import { useState } from "react";
import {
  Radio,
  Plus,
  Link,
  Loader2,
  Download,
  Trash2,
  Eye,
  Sparkles,
  FileText,
  Globe,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePipeline, Regulation } from "@/contexts/PipelineContext";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";
import { useToast } from "@/hooks/use-toast";
import { RegulationDetailModal } from "@/components/agents/RegulationDetailModal";
import { RegulationStatsCards } from "@/components/agents/RegulationStatsCards";
import { supabase } from "@/integrations/supabase/client";

export default function RegulationMonitorPage() {
  const { regulations, addRegulations, setRegulations } = usePipeline();
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);

  const { isLoading, runAgent, response } = useStreamingAgent();

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;

    setIsCrawling(true);
    try {
      // First, crawl the URL using Firecrawl
      toast({ title: "Crawling webpage...", description: "Fetching content from the URL" });
      
      const { data: crawlData, error: crawlError } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url: urlInput, options: { formats: ['markdown'], onlyMainContent: true } },
      });

      if (crawlError || !crawlData?.success) {
        throw new Error(crawlData?.error || crawlError?.message || 'Failed to crawl URL');
      }

      const crawledContent = crawlData.data?.markdown || crawlData.markdown || '';
      const pageTitle = crawlData.data?.metadata?.title || crawlData.metadata?.title || '';
      
      if (!crawledContent) {
        throw new Error('No content found on the page');
      }

      toast({ title: "Analyzing content...", description: "AI is extracting regulatory information" });

      // Then analyze with AI
      await runAgent("agent-regulation-monitor", {
        url: urlInput,
        crawledContent: crawledContent.slice(0, 15000), // Limit content size
      });

      let hostname = "Unknown Source";
      try {
        hostname = new URL(urlInput).hostname;
      } catch {
        hostname = urlInput.slice(0, 30);
      }

      const newRegulation: Regulation = {
        id: crypto.randomUUID(),
        source: hostname,
        title: pageTitle || `Regulation from ${hostname}`,
        date: new Date().toISOString().split("T")[0],
        version: "1.0",
        content: crawledContent.slice(0, 5000),
        url: urlInput,
      };

      addRegulations([newRegulation]);
      setUrlInput("");
      toast({ title: "Regulation crawled successfully", description: "Content extracted and analyzed" });
    } catch (error) {
      console.error('Crawl error:', error);
      toast({ 
        title: "Failed to crawl URL", 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive" 
      });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleParseText = async () => {
    if (!textInput.trim()) return;

    try {
      await runAgent("agent-regulation-monitor", {
        query: `Parse and analyze this regulation text, identifying key compliance requirements: ${textInput.slice(0, 3000)}`,
      });

      const newRegulation: Regulation = {
        id: crypto.randomUUID(),
        source: "Manual Input",
        title: textInput.slice(0, 60).trim() + (textInput.length > 60 ? "..." : ""),
        date: new Date().toISOString().split("T")[0],
        version: "1.0",
        content: textInput,
      };

      addRegulations([newRegulation]);
      setTextInput("");
      toast({ title: "Regulation added successfully" });
    } catch {
      // Error handled in hook
    }
  };

  const handleLoadDemo = () => {
    const demoRegulations: Regulation[] = [
      {
        id: crypto.randomUUID(),
        source: "incometax.gov.in",
        title: "Income Tax Act Section 194C - TDS on Contracts",
        date: "2024-04-01",
        version: "2024.1",
        content:
          "Section 194C mandates deduction of tax at source (TDS) on payments made to contractors and sub-contractors. Rate: 1% for individuals/HUF, 2% for others. Threshold: Rs. 30,000 single payment or Rs. 1,00,000 aggregate. GSTIN verification required for payments exceeding Rs. 50 lakhs.",
      },
      {
        id: crypto.randomUUID(),
        source: "cbic.gov.in",
        title: "GST Circular No. 215/9/2024 - E-Invoicing",
        date: "2024-03-15",
        version: "2024.2",
        content:
          "E-invoicing mandatory for businesses with annual turnover exceeding Rs. 5 crore. All B2B invoices must be registered on Invoice Registration Portal (IRP) within 7 days. Non-compliance attracts penalty under Section 122.",
      },
      {
        id: crypto.randomUUID(),
        source: "rbi.org.in",
        title: "RBI Master Direction - FEMA Guidelines",
        date: "2024-02-20",
        version: "2024.1",
        content:
          "Updated FEMA guidelines for government sector transactions. All foreign remittances above USD 25,000 require prior RBI approval. Form A2 mandatory for imports. FEMA compliance certificate required for payments to non-residents.",
      },
      {
        id: crypto.randomUUID(),
        source: "gem.gov.in",
        title: "GeM Procurement Policy - Price Bands",
        date: "2024-01-10",
        version: "3.0",
        content:
          "Government e-Marketplace procurement rules. L1 matching policy applicable. Price variation allowed up to 10% for small sellers. Mandatory quality certification for items above Rs. 25,000. Bid security of 2% required for tenders above Rs. 10 lakhs.",
      },
    ];
    addRegulations(demoRegulations);
    toast({ title: "Demo regulations loaded", description: "4 sample Indian government regulations added" });
  };

  const handleDelete = (id: string) => {
    setRegulations(regulations.filter((r) => r.id !== id));
    toast({ title: "Regulation removed" });
  };

  const handleView = (regulation: Regulation) => {
    setSelectedRegulation(regulation);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      key: "source",
      header: "Source",
      render: (item: Regulation) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {item.source}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (item: Regulation) => (
        <div className="max-w-[300px]">
          <p className="font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.content.slice(0, 80)}...
          </p>
        </div>
      ),
    },
    { key: "date", header: "Date" },
    {
      key: "version",
      header: "Version",
      render: (item: Regulation) => (
        <span className="text-xs font-mono text-muted-foreground">v{item.version}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Regulation) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleView(item);
            }}
            title="View details"
          >
            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <AgentPageHeader
        icon={Radio}
        title="Regulation Monitoring Agent"
        description="Continuously fetch and index regulations from Indian government portals"
        step={1}
        nextAgent={{ title: "Legal Parsing", url: "/agents/legal-parser" }}
      />

      <RegulationStatsCards regulations={regulations} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add Regulations
              </CardTitle>
              <CardDescription>
                Fetch from URL or paste regulation text directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="url">
                <TabsList className="w-full bg-secondary/50">
                  <TabsTrigger value="url" className="flex-1 gap-2">
                    <Link className="h-3.5 w-3.5" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1 gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Regulation URL</Label>
                    <Input
                      placeholder="https://incometax.gov.in/..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleFetchFromUrl}
                    disabled={isLoading || isCrawling || !urlInput.trim()}
                  >
                    {isCrawling || isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {isCrawling ? "Crawling..." : isLoading ? "Analyzing..." : "Crawl & Analyze"}
                  </Button>
                </TabsContent>

                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Paste Regulation Text</Label>
                    <Textarea
                      placeholder="Paste regulation text, circular, or notification here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={6}
                      className="bg-background/50 resize-none"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleParseText}
                    disabled={isLoading || !textInput.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isLoading ? "Processing..." : "Analyze & Add"}
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={handleLoadDemo}
                >
                  Load Demo Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Response Preview */}
          {response && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">
                  {response}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Regulations Table */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Fetched Regulations</CardTitle>
                  <CardDescription>
                    {regulations.length} regulation{regulations.length !== 1 ? "s" : ""} indexed
                  </CardDescription>
                </div>
                {regulations.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Ready for Legal Parsing
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={regulations}
                columns={columns}
                emptyMessage="No regulations fetched yet. Add URLs or paste text to get started."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <RegulationDetailModal
        regulation={selectedRegulation}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </DashboardLayout>
  );
}
