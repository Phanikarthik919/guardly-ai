import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Scale, FileText, AlertTriangle, GitBranch, Copy, Check } from "lucide-react";
import { ParsedClause, Regulation } from "@/contexts/PipelineContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ClauseDetailModalProps {
  clause: ParsedClause | null;
  regulation: Regulation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClauseDetailModal({ clause, regulation, open, onOpenChange }: ClauseDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!clause) return null;

  const handleCopyJson = () => {
    const jsonOutput = {
      clauseId: clause.clauseId,
      regulationId: clause.regulationId,
      rule: clause.rule,
      conditions: clause.conditions,
      penalties: clause.penalties,
      sourceRegulation: regulation?.title || "Unknown",
    };
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{clause.clauseId}</DialogTitle>
                <p className="text-sm text-muted-foreground">Parsed Compliance Clause</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyJson}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy JSON"}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Source Regulation */}
            {regulation && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Source Regulation</span>
                </div>
                <p className="font-medium">{regulation.title}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{regulation.source}</Badge>
                  <Badge variant="secondary">{regulation.date}</Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Rule */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">Compliance Rule</span>
              </div>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{clause.rule}</p>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Conditions (IF-THEN)</span>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{clause.conditions || "No conditions specified"}</p>
              </div>
            </div>

            {/* Penalties */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Penalties & Consequences</span>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{clause.penalties || "No penalties specified"}</p>
              </div>
            </div>

            {/* Machine-Readable Format */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Machine-Readable Format</span>
              <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto font-mono">
{`{
  "clauseId": "${clause.clauseId}",
  "rule": "${clause.rule.slice(0, 50)}...",
  "conditions": "${clause.conditions?.slice(0, 50) || "N/A"}...",
  "penalties": "${clause.penalties?.slice(0, 50) || "N/A"}..."
}`}
              </pre>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
