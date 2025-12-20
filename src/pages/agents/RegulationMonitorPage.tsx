import { useState } from "react";
import { Radio, Plus, Upload, Link, Loader2, Download, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePipeline, Regulation } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function RegulationMonitorPage() {
  const { regulations, addRegulations, setRegulations } = usePipeline();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");

  const handleFetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-regulation-monitor', {
        body: { 
          query: `Analyze this regulation source URL and extract regulation metadata. URL: ${urlInput}. 
          Return a JSON array with objects containing: source, title, date, version, content summary.`
        }
      });

      if (error) throw error;

      const newRegulation: Regulation = {
        id: crypto.randomUUID(),
        source: urlInput,
        title: `Regulation from ${new URL(urlInput).hostname}`,
        date: new Date().toISOString().split('T')[0],
        version: "1.0",
        content: data.response || "Fetched regulation content",
        url: urlInput
      };

      addRegulations([newRegulation]);
      setUrlInput("");
      toast({ title: "Regulation fetched successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to fetch regulation", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParseText = async () => {
    if (!textInput.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-regulation-monitor', {
        body: { 
          query: `Parse this regulation text and extract metadata: ${textInput.slice(0, 2000)}`
        }
      });

      if (error) throw error;

      const newRegulation: Regulation = {
        id: crypto.randomUUID(),
        source: "Manual Input",
        title: textInput.slice(0, 50) + (textInput.length > 50 ? "..." : ""),
        date: new Date().toISOString().split('T')[0],
        version: "1.0",
        content: textInput
      };

      addRegulations([newRegulation]);
      setTextInput("");
      toast({ title: "Regulation added successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to parse regulation", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    const demoRegulations: Regulation[] = [
      {
        id: crypto.randomUUID(),
        source: "SEC.gov",
        title: "Securities Exchange Act Rule 10b-5",
        date: "2024-01-15",
        version: "2024.1",
        content: "Employment of Manipulative and Deceptive Devices. It shall be unlawful for any person, directly or indirectly, by the use of any means or instrumentality of interstate commerce..."
      },
      {
        id: crypto.randomUUID(),
        source: "Treasury.gov",
        title: "Bank Secrecy Act - AML Requirements",
        date: "2024-02-01",
        version: "2024.2",
        content: "Financial institutions must establish anti-money laundering programs that include internal policies, procedures, and controls; designation of a compliance officer..."
      },
      {
        id: crypto.randomUUID(),
        source: "CFPB.gov",
        title: "Truth in Lending Act (Regulation Z)",
        date: "2024-01-20",
        version: "2024.1",
        content: "Creditors must disclose the annual percentage rate, the terms of the loan, and the total costs to the borrower..."
      }
    ];
    addRegulations(demoRegulations);
    toast({ title: "Demo regulations loaded" });
  };

  const handleDelete = (id: string) => {
    setRegulations(regulations.filter(r => r.id !== id));
  };

  const columns = [
    { key: "source", header: "Source" },
    { key: "title", header: "Title" },
    { key: "date", header: "Date" },
    { key: "version", header: "Version" },
    { 
      key: "actions", 
      header: "Actions",
      render: (item: Regulation) => (
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
        icon={Radio}
        title="Regulation Monitoring Agent"
        description="Continuously fetch and index regulations from government portals"
        step={1}
        nextAgent={{ title: "Legal Parsing", url: "/agents/legal-parser" }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Regulations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="url">
                <TabsList className="w-full">
                  <TabsTrigger value="url" className="flex-1">
                    <Link className="h-4 w-4 mr-2" />
                    URL
                  </TabsTrigger>
                  <TabsTrigger value="text" className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Text
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="url" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Regulation URL</Label>
                    <Input 
                      placeholder="https://sec.gov/rules/..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleFetchFromUrl}
                    disabled={loading || !urlInput.trim()}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Fetch Regulations
                  </Button>
                </TabsContent>

                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Paste Regulation Text</Label>
                    <Textarea 
                      placeholder="Paste regulation text here..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleParseText}
                    disabled={loading || !textInput.trim()}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Regulation
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="mt-4 pt-4 border-t border-border">
                <Button variant="outline" className="w-full" onClick={handleLoadDemo}>
                  Load Demo Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fetched Regulations ({regulations.length})</CardTitle>
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
    </DashboardLayout>
  );
}
