import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Transaction } from "@/contexts/PipelineContext";
import { DollarSign, Calendar, Building2, FileText, Tag, Receipt, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailModal({ transaction, open, onOpenChange }: TransactionDetailModalProps) {
  const { toast } = useToast();

  if (!transaction) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(transaction, null, 2));
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono">
              {transaction.category}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{transaction.vendor}</DialogTitle>
          <DialogDescription>
            Transaction details extracted from document
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Amount</span>
              </div>
              <p className="text-lg font-semibold">{transaction.amount}</p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Receipt className="h-4 w-4" />
                <span className="text-xs">Tax</span>
              </div>
              <p className="text-lg font-semibold">{transaction.tax}</p>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Date</span>
            </div>
            <p className="font-medium">{transaction.date}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Vendor</span>
            </div>
            <p className="font-medium">{transaction.vendor}</p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Tag className="h-4 w-4" />
              <span className="text-xs">Category</span>
            </div>
            <p className="font-medium">{transaction.category}</p>
          </div>

          {transaction.description && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Description</span>
              </div>
              <p className="text-sm">{transaction.description}</p>
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
