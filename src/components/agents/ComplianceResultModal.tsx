import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ComplianceResult, Transaction, ParsedClause } from "@/contexts/PipelineContext";
import { AlertTriangle, CheckCircle2, AlertCircle, FileWarning, Copy, Scale, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComplianceResultModalProps {
  result: ComplianceResult | null;
  transaction: Transaction | null;
  clause: ParsedClause | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusIcons = {
  compliant: CheckCircle2,
  violation: AlertTriangle,
  warning: AlertCircle,
  missing_docs: FileWarning,
};

const statusColors = {
  compliant: "text-success bg-success/10 border-success/20",
  violation: "text-destructive bg-destructive/10 border-destructive/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  missing_docs: "text-muted-foreground bg-muted border-muted-foreground/20",
};

const riskColors = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

export function ComplianceResultModal({ result, transaction, clause, open, onOpenChange }: ComplianceResultModalProps) {
  const { toast } = useToast();

  if (!result) return null;

  const StatusIcon = statusIcons[result.status];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify({ result, transaction, clause }, null, 2));
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={statusColors[result.status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {result.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={riskColors[result.riskLevel]}>
              {result.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
          <DialogTitle className="text-xl">Compliance Check Result</DialogTitle>
          <DialogDescription>
            Detailed analysis of transaction against regulatory clause
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          {/* Transaction Info */}
          {transaction && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Transaction</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{transaction.vendor}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">{transaction.amount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{transaction.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{transaction.date}</p>
                </div>
              </div>
              {transaction.description && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <p>{transaction.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Clause Info */}
          {clause && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Scale className="h-4 w-4" />
                <span className="font-medium">Regulatory Clause</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Clause ID:</span>
                  <p className="font-mono font-medium">{clause.clauseId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rule:</span>
                  <p>{clause.rule}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Conditions:</span>
                  <p>{clause.conditions}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Penalties:</span>
                  <p className="text-destructive">{clause.penalties}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-medium mb-2">AI Analysis</h4>
            <p className="text-sm">{result.reasoning}</p>
          </div>

          {/* Missing Docs */}
          {result.missingDocs && result.missingDocs.length > 0 && (
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <h4 className="font-medium text-warning mb-2 flex items-center gap-2">
                <FileWarning className="h-4 w-4" />
                Missing Documentation
              </h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.missingDocs.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleCopyJson}>
            <Copy className="h-4 w-4 mr-2" />
            Copy as JSON
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
