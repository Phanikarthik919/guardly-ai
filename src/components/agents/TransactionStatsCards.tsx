import { DollarSign, Receipt, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Transaction } from "@/contexts/PipelineContext";

interface TransactionStatsCardsProps {
  transactions: Transaction[];
}

export function TransactionStatsCards({ transactions }: TransactionStatsCardsProps) {
  const parseAmount = (amount: string): number => {
    const num = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const totalAmount = transactions.reduce((sum, t) => sum + parseAmount(t.amount), 0);
  const totalTax = transactions.reduce((sum, t) => sum + parseAmount(t.tax), 0);
  const uniqueVendors = new Set(transactions.map(t => t.vendor)).size;
  const categories = new Set(transactions.map(t => t.category)).size;

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
              <p className="text-xs text-muted-foreground">Total Tax</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-secondary/50 to-secondary/30 border-secondary/40">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <Building2 className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueVendors}</p>
              <p className="text-xs text-muted-foreground">Unique Vendors</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
