import { CheckCircle2, AlertTriangle, AlertCircle, FileWarning, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ComplianceResult } from "@/contexts/PipelineContext";

interface ComplianceStatsCardsProps {
  results: ComplianceResult[];
}

export function ComplianceStatsCards({ results }: ComplianceStatsCardsProps) {
  const stats = {
    compliant: results.filter(r => r.status === 'compliant').length,
    violations: results.filter(r => r.status === 'violation').length,
    warnings: results.filter(r => r.status === 'warning').length,
    missingDocs: results.filter(r => r.status === 'missing_docs').length,
    highRisk: results.filter(r => r.riskLevel === 'high').length,
    total: results.length,
  };

  const complianceRate = stats.total > 0 
    ? Math.round((stats.compliant / stats.total) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{stats.compliant}</p>
              <p className="text-xs text-muted-foreground">Compliant</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.violations}</p>
              <p className="text-xs text-muted-foreground">Violations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{stats.warnings}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-muted to-muted/50 border-muted-foreground/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted-foreground/20 rounded-lg">
              <FileWarning className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.missingDocs}</p>
              <p className="text-xs text-muted-foreground">Missing Docs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              {complianceRate >= 70 ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{complianceRate}%</p>
              <p className="text-xs text-muted-foreground">Compliance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
