import { useState } from "react";
import { ClipboardCheck, Loader2, Download, FileText, BarChart3 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePipeline, AuditReport } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AuditorAssistantPage() {
  const { 
    complianceResults, 
    parsedClauses,
    transactions,
    auditReports, 
    addAuditReport 
  } = usePipeline();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);

  const handleGenerateReport = async () => {
    if (selectedResultIds.length === 0) {
      toast({ 
        title: "Please select compliance results to audit", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const selectedResults = complianceResults.filter(r => selectedResultIds.includes(r.id));
      
      const { data, error } = await supabase.functions.invoke('agent-auditor-assistant', {
        body: { 
          query: `Generate an audit report for these compliance results. Include clause references, reasoning, and corrective actions.
          Results: ${JSON.stringify(selectedResults.map(r => ({
            status: r.status,
            risk: r.riskLevel,
            reasoning: r.reasoning
          })))}`
        }
      });

      if (error) throw error;

      const report: AuditReport = {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecked: selectedResults.length,
          compliant: selectedResults.filter(r => r.status === 'compliant').length,
          violations: selectedResults.filter(r => r.status === 'violation').length,
          warnings: selectedResults.filter(r => r.status === 'warning').length,
        },
        details: selectedResults.map(r => {
          const clause = parsedClauses.find(c => c.id === r.clauseId);
          return {
            complianceResultId: r.id,
            clauseReference: clause?.clauseId || 'Unknown',
            reasoning: r.reasoning,
            correctiveAction: r.status === 'violation' 
              ? "Immediate review required. Implement controls and document remediation steps."
              : r.status === 'warning'
              ? "Monitor closely. Consider implementing additional safeguards."
              : r.status === 'missing_docs'
              ? "Obtain and archive required documentation within 30 days."
              : "No action required. Continue standard monitoring."
          };
        })
      };

      addAuditReport(report);
      setActiveReport(report);
      setSelectedResultIds([]);
      toast({ title: "Audit report generated successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to generate report", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!activeReport) return;
    // For demo, export as JSON (PDF would require a library like jsPDF)
    const blob = new Blob([JSON.stringify(activeReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${activeReport.generatedAt.split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
  };

  const resultColumns = [
    { 
      key: "transactionId", 
      header: "Transaction",
      render: (item: any) => {
        const tx = transactions.find(t => t.id === item.transactionId);
        return tx ? `${tx.vendor}` : item.transactionId.slice(0, 8);
      }
    },
    { 
      key: "status", 
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    { 
      key: "riskLevel", 
      header: "Risk",
      render: (item: any) => <StatusBadge status={item.riskLevel} />
    },
  ];

  if (complianceResults.length === 0) {
    return (
      <DashboardLayout>
        <AgentPageHeader
          icon={ClipboardCheck}
          title="Auditor Assistant Agent"
          description="Generate explainable reports with corrective recommendations"
          step={5}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Compliance Results Available</h3>
            <p className="text-muted-foreground mb-4">
              First run compliance checks to generate audit reports
            </p>
            <Button onClick={() => navigate('/agents/compliance-mapping')}>
              Go to Compliance Mapping
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AgentPageHeader
        icon={ClipboardCheck}
        title="Auditor Assistant Agent"
        description="Generate explainable reports with corrective recommendations"
        step={5}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Results to Audit</CardTitle>
              <CardDescription>
                {complianceResults.length} compliance results available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable 
                data={complianceResults} 
                columns={resultColumns}
                selectable
                selectedIds={selectedResultIds}
                onSelectionChange={setSelectedResultIds}
              />
              <Button 
                className="w-full"
                onClick={handleGenerateReport}
                disabled={loading || selectedResultIds.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                Generate Audit Report
              </Button>
            </CardContent>
          </Card>

          {auditReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Previous Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {auditReports.map((report) => (
                  <Button 
                    key={report.id}
                    variant={activeReport?.id === report.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveReport(report)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          {activeReport ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Audit Report</CardTitle>
                  <CardDescription>
                    Generated on {new Date(activeReport.generatedAt).toLocaleString()}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Summary
                    </TabsTrigger>
                    <TabsTrigger value="details">
                      <FileText className="h-4 w-4 mr-2" />
                      Details
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-muted rounded-lg text-center">
                        <p className="text-2xl font-bold">{activeReport.summary.totalChecked}</p>
                        <p className="text-xs text-muted-foreground">Total Checked</p>
                      </div>
                      <div className="p-4 bg-success/10 rounded-lg text-center">
                        <p className="text-2xl font-bold text-success">{activeReport.summary.compliant}</p>
                        <p className="text-xs text-muted-foreground">Compliant</p>
                      </div>
                      <div className="p-4 bg-destructive/10 rounded-lg text-center">
                        <p className="text-2xl font-bold text-destructive">{activeReport.summary.violations}</p>
                        <p className="text-xs text-muted-foreground">Violations</p>
                      </div>
                      <div className="p-4 bg-warning/10 rounded-lg text-center">
                        <p className="text-2xl font-bold text-warning">{activeReport.summary.warnings}</p>
                        <p className="text-xs text-muted-foreground">Warnings</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        This audit reviewed {activeReport.summary.totalChecked} compliance checks. 
                        {activeReport.summary.violations > 0 && ` ${activeReport.summary.violations} violation(s) require immediate attention.`}
                        {activeReport.summary.warnings > 0 && ` ${activeReport.summary.warnings} warning(s) should be monitored.`}
                        {activeReport.summary.compliant === activeReport.summary.totalChecked && ' All items are compliant.'}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4 space-y-4">
                    {activeReport.details.map((detail, index) => {
                      const result = complianceResults.find(r => r.id === detail.complianceResultId);
                      return (
                        <div key={index} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm text-primary">
                              Clause: {detail.clauseReference}
                            </span>
                            {result && <StatusBadge status={result.status} />}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Reasoning:</span>
                              <p className="mt-1">{detail.reasoning}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Corrective Action:</span>
                              <p className="mt-1 text-foreground">{detail.correctiveAction}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Report Selected</h3>
                <p className="text-muted-foreground">
                  Select compliance results and generate a report, or view a previous report
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
