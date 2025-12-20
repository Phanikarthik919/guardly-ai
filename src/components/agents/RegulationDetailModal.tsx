import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar, Globe, Tag, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Regulation } from "@/contexts/PipelineContext";

interface RegulationDetailModalProps {
  regulation: Regulation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegulationDetailModal({
  regulation,
  open,
  onOpenChange,
}: RegulationDetailModalProps) {
  if (!regulation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <span className="leading-tight">{regulation.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary" className="gap-1.5">
            <Globe className="w-3 h-3" />
            {regulation.source}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="w-3 h-3" />
            {regulation.date}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Tag className="w-3 h-3" />
            v{regulation.version}
          </Badge>
        </div>

        <Separator className="my-4" />

        <ScrollArea className="flex-1 pr-4 max-h-[400px]">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Content
            </h4>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {regulation.content}
            </p>
          </div>
        </ScrollArea>

        {regulation.url && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(regulation.url, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              View Original Source
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
