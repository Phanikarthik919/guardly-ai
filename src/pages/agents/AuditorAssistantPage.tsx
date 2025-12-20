import { useState } from "react";
import { ClipboardCheck, Loader2, Download, FileText, BarChart3, Sparkles, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable, StatusBadge } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePipeline, AuditReport } from "@/contexts/PipelineContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AuditReportStatsCards } from "@/components/agents/AuditReportStatsCards";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";

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
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);

  const { response, isLoading, runAgent, clearResponse } = useStreamingAgent({
    onComplete: () => {}
  });

  const handleGenerateReport = async () => {
    if (selectedResultIds.length === 0) {
      toast({ 
        title: "Please select compliance results to audit", 
        variant: "destructive" 
      });
      return;
    }

    const selectedResults = complianceResults.filter(r => selectedResultIds.includes(r.id));
    
    clearResponse();
    await runAgent('agent-auditor-assistant', {
      complianceData: selectedResults.map(r => {
        const tx = transactions.find(t => t.id === r.transactionId);
        const clause = parsedClauses.find(c => c.id === r.clauseId);
        return {
          status: r.status,
          risk: r.riskLevel,
          reasoning: r.reasoning,
          transaction: tx ? `${tx.vendor} - ${tx.amount}` : 'Unknown',
          clause: clause?.clauseId || 'Unknown'
        };
      })
    });

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
  };

  const handleExportPdf = () => {
    if (!activeReport) return;
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
        <Card className="border-dashed">
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
          <Card className="border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-lg">Select Results to Audit</CardTitle>
              <CardDescription>
                {complianceResults.length} compliance results available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
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
                disabled={isLoading || selectedResultIds.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Generate Audit Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* AI Processing Indicator */}
          {isLoading && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Generating audit report...</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {response || "Analyzing compliance results and generating recommendations..."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <span className="flex-1 text-left">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {report.summary.totalChecked}
                    </Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          {activeReport ? (
            <div className="space-y-6">
              <AuditReportStatsCards report={activeReport} />

              <Card>
                <CardHeader className="flex flex-row items-start justify-between bg-gradient-to-r from-muted/50 to-transparent">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Audit Report
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      Generated on {new Date(activeReport.generatedAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportPdf}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <Tabs defaultValue="summary">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="summary">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Summary
                      </TabsTrigger>
                      <TabsTrigger value="details">
                        <FileText className="h-4 w-4 mr-2" />
                        Details
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-4 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4 text-primary" />
                          Executive Summary
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          This audit reviewed {activeReport.summary.totalChecked} compliance checks. 
                          {activeReport.summary.violations > 0 && (
                            <span className="text-destructive font-medium">
                              {" "}{activeReport.summary.violations} violation(s) require immediate attention.
                            </span>
                          )}
                          {activeReport.summary.warnings > 0 && (
                            <span className="text-warning font-medium">
                              {" "}{activeReport.summary.warnings} warning(s) should be monitored.
                            </span>
                          )}
                          {activeReport.summary.compliant === activeReport.summary.totalChecked && (
                            <span className="text-success font-medium">
                              {" "}All items are compliant.
                            </span>
                          )}
                        </p>
                      </div>

                      {activeReport.summary.violations > 0 && (
                        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                          <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Critical Actions Required
                          </h4>
                          <p className="text-sm">
                            Immediate review and remediation required for {activeReport.summary.violations} violation(s).
                            Please refer to the Details tab for specific corrective actions.
                          </p>
                        </div>
                      )}

                      {activeReport.summary.compliant > 0 && (
                        <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                          <h4 className="font-medium text-success mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Compliant Items
                          </h4>
                          <p className="text-sm">
                            {activeReport.summary.compliant} item(s) passed compliance checks.
                            Continue standard monitoring and documentation practices.
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="details" className="mt-4 space-y-4">
                      {activeReport.details.map((detail, index) => {
                        const result = complianceResults.find(r => r.id === detail.complianceResultId);
                        return (
                          <div key={index} className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-mono text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                                {detail.clauseReference}
                              </span>
                              {result && <StatusBadge status={result.status} />}
                            </div>
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-muted-foreground font-medium">Reasoning:</span>
                                <p className="mt-1">{detail.reasoning}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg">
                                <span className="text-muted-foreground font-medium">Corrective Action:</span>
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
            </div>
          ) : (
            <Card className="border-dashed h-full min-h-[400px] flex items-center justify-center">
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
