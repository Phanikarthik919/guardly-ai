import { useState, useEffect, useMemo } from "react";
import {
  Radio,
  Plus,
  Link,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  FileText,
  Globe,
  RefreshCw,
  Clock,
  Database,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipeline, Regulation } from "@/contexts/PipelineContext";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";
import { useToast } from "@/hooks/use-toast";
import { RegulationDetailModal } from "@/components/agents/RegulationDetailModal";
import { RegulationStatsCards } from "@/components/agents/RegulationStatsCards";
import { supabase } from "@/integrations/supabase/clientRuntime";
import { getSupabasePublicConfig } from "@/lib/publicConfig";
import { ScrollArea } from "@/components/ui/scroll-area";

interface IndexedRegulation {
  id: string;
  url: string;
  source: string;
  title: string | null;
  summary: string | null;
  category: string | null;
  crawled_at: string;
  is_processed: boolean;
}

interface PortalInfo {
  id: string;
  name: string;
  base_url: string;
  category: string;
  is_active: boolean;
  last_crawled_at: string | null;
}

interface CrawlProgress {
  status: "idle" | "running" | "complete" | "error";
  currentPortal: string | null;
  currentUrl: string | null;
  logs: { type: "info" | "success" | "error" | "warning"; message: string; timestamp: Date }[];
  stats: { indexed: number; skipped: number; failed: number };
}

export default function RegulationMonitorPage() {
  const { regulations, addRegulations, setRegulations } = usePipeline();
  const { toast } = useToast();
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [indexedRegulations, setIndexedRegulations] = useState<IndexedRegulation[]>([]);
  const [portals, setPortals] = useState<PortalInfo[]>([]);
  const [activeTab, setActiveTab] = useState("crawler");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Crawl progress
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress>({
    status: "idle",
    currentPortal: null,
    currentUrl: null,
    logs: [],
    stats: { indexed: 0, skipped: 0, failed: 0 },
  });

  const { isLoading, runAgent, response } = useStreamingAgent();

  useEffect(() => {
    fetchIndexedRegulations();
    fetchPortals();
  }, []);

  const fetchIndexedRegulations = async () => {
    const { data, error } = await supabase
      .from("indexed_regulations")
      .select("id, url, source, title, summary, category, crawled_at, is_processed")
      .order("crawled_at", { ascending: false })
      .limit(500);

    if (!error && data) {
      setIndexedRegulations(data);
    }
  };

  const fetchPortals = async () => {
    const { data, error } = await supabase
      .from("regulation_portals")
      .select("*")
      .eq("is_active", true);

    if (!error && data) {
      setPortals(data);
    }
  };

  // Filtered regulations
  const filteredRegulations = useMemo(() => {
    return indexedRegulations.filter((reg) => {
      const matchesSearch =
        !searchQuery ||
        reg.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.url.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || reg.category === categoryFilter;
      const matchesSource = sourceFilter === "all" || reg.source === sourceFilter;

      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [indexedRegulations, searchQuery, categoryFilter, sourceFilter]);

  // Get unique categories and sources
  const categories = useMemo(() => {
    const cats = new Set(indexedRegulations.map((r) => r.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [indexedRegulations]);

  const sources = useMemo(() => {
    const srcs = new Set(indexedRegulations.map((r) => r.source).filter(Boolean));
    return Array.from(srcs) as string[];
  }, [indexedRegulations]);

  const handleRunCrawler = async () => {
    setCrawlProgress({
      status: "running",
      currentPortal: null,
      currentUrl: null,
      logs: [{ type: "info", message: "Starting crawler...", timestamp: new Date() }],
      stats: { indexed: 0, skipped: 0, failed: 0 },
    });

    try {
      const response = await fetch(
        `${getSupabasePublicConfig().url}/functions/v1/regulation-crawler`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getSupabasePublicConfig().publishableKey}`,
          },
          body: JSON.stringify({ stream: true }),
        }
      );

      if (!response.ok) throw new Error("Failed to start crawler");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) continue;
          if (line.startsWith("data:")) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              handleCrawlEvent(data);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setCrawlProgress((prev) => ({
        ...prev,
        status: "complete",
        currentPortal: null,
        currentUrl: null,
        logs: [...prev.logs, { type: "success", message: "Crawl complete!", timestamp: new Date() }],
      }));

      toast({ title: "Crawl complete", description: "All portals processed successfully" });
      fetchIndexedRegulations();
      fetchPortals();
    } catch (error) {
      setCrawlProgress((prev) => ({
        ...prev,
        status: "error",
        logs: [
          ...prev.logs,
          { type: "error", message: error instanceof Error ? error.message : "Unknown error", timestamp: new Date() },
        ],
      }));
      toast({ title: "Crawler failed", variant: "destructive" });
    }
  };

  const handleCrawlEvent = (data: any) => {
    setCrawlProgress((prev) => {
      const newLogs = [...prev.logs];
      const newStats = { ...prev.stats };
      let currentPortal = prev.currentPortal;
      let currentUrl = prev.currentUrl;

      if (data.portal) currentPortal = data.portal;

      switch (true) {
        case "portal_start" in data || data.portal_start !== undefined:
          newLogs.push({ type: "info", message: `Starting: ${data.portal}`, timestamp: new Date() });
          break;
        case "urls_found" in data || data.relevant !== undefined:
          newLogs.push({
            type: "info",
            message: `Found ${data.relevant} relevant URLs in ${data.portal}`,
            timestamp: new Date(),
          });
          break;
        case "scraping" in data || data.url !== undefined:
          currentUrl = data.url;
          break;
        case "indexed" in data || (data.title && !data.error):
          newStats.indexed++;
          newLogs.push({ type: "success", message: `Indexed: ${data.title?.slice(0, 50) || data.url}`, timestamp: new Date() });
          break;
        case "skipped" in data || data.reason === "unchanged":
          newStats.skipped++;
          break;
        case "scrape_failed" in data:
          newStats.failed++;
          newLogs.push({ type: "warning", message: `Retry failed: ${data.url?.slice(0, 40)}...`, timestamp: new Date() });
          break;
        case "portal_complete" in data || (data.indexed !== undefined && data.failed !== undefined):
          newLogs.push({
            type: "info",
            message: `${data.portal}: ${data.indexed} indexed, ${data.skipped} skipped, ${data.failed} failed`,
            timestamp: new Date(),
          });
          break;
        case "error" in data:
          newLogs.push({ type: "error", message: data.error, timestamp: new Date() });
          break;
      }

      return { ...prev, logs: newLogs.slice(-50), stats: newStats, currentPortal, currentUrl };
    });
  };

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;

    setIsCrawling(true);
    try {
      toast({ title: "Crawling webpage...", description: "Fetching content from the URL" });

      const { data: crawlData, error: crawlError } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url: urlInput, options: { formats: ["markdown"], onlyMainContent: true } },
      });

      if (crawlError || !crawlData?.success) {
        throw new Error(crawlData?.error || crawlError?.message || "Failed to crawl URL");
      }

      const crawledContent = crawlData.data?.markdown || crawlData.markdown || "";
      const pageTitle = crawlData.data?.metadata?.title || crawlData.metadata?.title || "";

      if (!crawledContent) {
        throw new Error("No content found on the page");
      }

      toast({ title: "Analyzing content...", description: "AI is extracting regulatory information" });

      await runAgent("agent-regulation-monitor", {
        url: urlInput,
        crawledContent: crawledContent.slice(0, 15000),
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
      console.error("Crawl error:", error);
      toast({
        title: "Failed to crawl URL",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleParseText = async () => {
    if (!textInput.trim()) return;

    try {
      await runAgent("agent-regulation-monitor", {
        query: `Parse and analyze this regulation text: ${textInput.slice(0, 3000)}`,
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
          "Section 194C mandates deduction of tax at source (TDS) on payments made to contractors and sub-contractors. Rate: 1% for individuals/HUF, 2% for others.",
      },
      {
        id: crypto.randomUUID(),
        source: "cbic.gov.in",
        title: "GST Circular No. 215/9/2024 - E-Invoicing",
        date: "2024-03-15",
        version: "2024.2",
        content: "E-invoicing mandatory for businesses with annual turnover exceeding Rs. 5 crore.",
      },
    ];
    addRegulations(demoRegulations);
    toast({ title: "Demo regulations loaded" });
  };

  const handleDelete = (id: string) => {
    setRegulations(regulations.filter((r) => r.id !== id));
    toast({ title: "Regulation removed" });
  };

  const handleView = (regulation: Regulation) => {
    setSelectedRegulation(regulation);
    setDetailModalOpen(true);
  };

  const indexedColumns = [
    {
      key: "title",
      header: "Regulation",
      render: (item: IndexedRegulation) => (
        <div className="max-w-[350px]">
          <p className="font-medium truncate text-sm">{item.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.summary?.slice(0, 80) || item.url}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (item: IndexedRegulation) => <Badge variant="secondary" className="text-xs">{item.source}</Badge>,
    },
    {
      key: "category",
      header: "Category",
      render: (item: IndexedRegulation) => (
        <Badge variant="outline" className="text-xs">{item.category || "General"}</Badge>
      ),
    },
    {
      key: "crawled_at",
      header: "Crawled",
      render: (item: IndexedRegulation) => (
        <span className="text-xs text-muted-foreground">{new Date(item.crawled_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: IndexedRegulation) => (
        <Badge variant={item.is_processed ? "default" : "secondary"} className="text-xs gap-1">
          {item.is_processed ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {item.is_processed ? "Processed" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: IndexedRegulation) => (
        <Button variant="ghost" size="icon" asChild>
          <a href={item.url} target="_blank" rel="noopener noreferrer" title="Open URL">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </Button>
      ),
    },
  ];

  const manualColumns = [
    {
      key: "source",
      header: "Source",
      render: (item: Regulation) => <Badge variant="secondary" className="text-xs">{item.source}</Badge>,
    },
    {
      key: "title",
      header: "Title",
      render: (item: Regulation) => (
        <div className="max-w-[300px]">
          <p className="font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.content.slice(0, 80)}...</p>
        </div>
      ),
    },
    { key: "date", header: "Date" },
    {
      key: "actions",
      header: "",
      render: (item: Regulation) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleView(item)} title="View">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const progressPercent =
    crawlProgress.status === "running"
      ? Math.min(((crawlProgress.stats.indexed + crawlProgress.stats.skipped + crawlProgress.stats.failed) / Math.max(portals.length * 5, 1)) * 100, 95)
      : crawlProgress.status === "complete"
      ? 100
      : 0;

  return (
    <DashboardLayout>
      <AgentPageHeader
        icon={Radio}
        title="Regulation Monitoring Agent"
        description="Continuously fetch and index regulations from Indian government portals"
        step={1}
        nextAgent={{ title: "Legal Parsing", url: "/agents/legal-parser" }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="crawler" className="gap-2">
            <Database className="h-4 w-4" />
            Automated Crawler
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Plus className="h-4 w-4" />
            Manual Input
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crawler" className="space-y-6">
          {/* Crawler Control */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Regulation Crawler</CardTitle>
                    <CardDescription>
                      Monitoring {portals.length} portals • {indexedRegulations.length} regulations indexed
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleRunCrawler} disabled={crawlProgress.status === "running"} className="gap-2">
                  {crawlProgress.status === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {crawlProgress.status === "running" ? "Crawling..." : "Run Crawler"}
                </Button>
              </div>
            </CardHeader>

            {crawlProgress.status !== "idle" && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {crawlProgress.currentPortal
                          ? `Processing: ${crawlProgress.currentPortal}`
                          : crawlProgress.status === "complete"
                          ? "Complete"
                          : "Starting..."}
                      </span>
                      <span className="font-medium">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">{crawlProgress.stats.indexed} Indexed</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">{crawlProgress.stats.skipped} Skipped</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">{crawlProgress.stats.failed} Failed</span>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-32 rounded-lg border bg-background/50 p-3">
                    <div className="space-y-1">
                      {crawlProgress.logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground whitespace-nowrap">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span
                            className={
                              log.type === "success"
                                ? "text-green-600"
                                : log.type === "error"
                                ? "text-red-600"
                                : log.type === "warning"
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Portals Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {portals.map((portal) => (
              <Card key={portal.id} className="bg-card/50">
                <CardContent className="p-4">
                  <Badge variant="outline" className="text-xs mb-2">{portal.category}</Badge>
                  <p className="font-medium text-sm">{portal.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {portal.last_crawled_at ? new Date(portal.last_crawled_at).toLocaleDateString() : "Not crawled"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Indexed Regulations Table */}
          <Card className="bg-card/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Indexed Regulations</CardTitle>
                  <CardDescription>
                    {filteredRegulations.length} of {indexedRegulations.length} regulations
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search regulations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px] bg-background/50"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[140px] bg-background/50">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[160px] bg-background/50">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {sources.map((src) => (
                        <SelectItem key={src} value={src}>{src}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredRegulations}
                columns={indexedColumns}
                emptyMessage="No regulations found. Run the crawler to fetch regulations."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <RegulationStatsCards regulations={regulations} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add Regulations
                  </CardTitle>
                  <CardDescription>Fetch from URL or paste regulation text</CardDescription>
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
                        {isCrawling || isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                        {isCrawling ? "Crawling..." : isLoading ? "Analyzing..." : "Crawl & Analyze"}
                      </Button>
                    </TabsContent>

                    <TabsContent value="text" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Paste Regulation Text</Label>
                        <Textarea
                          placeholder="Paste regulation text here..."
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
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isLoading ? "Processing..." : "Analyze & Add"}
                      </Button>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button variant="outline" className="w-full text-muted-foreground" onClick={handleLoadDemo}>
                      Load Demo Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {response && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{response}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Manual Regulations</CardTitle>
                      <CardDescription>{regulations.length} regulation{regulations.length !== 1 ? "s" : ""}</CardDescription>
                    </div>
                    {regulations.length > 0 && <Badge variant="outline" className="text-xs">Ready for Legal Parsing</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={regulations}
                    columns={manualColumns}
                    emptyMessage="No regulations added yet. Add URLs or paste text to get started."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <RegulationDetailModal regulation={selectedRegulation} open={detailModalOpen} onOpenChange={setDetailModalOpen} />
    </DashboardLayout>
  );
}
