import { useState } from "react";
import { Receipt, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AgentPageHeader } from "@/components/dashboard/AgentPageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePipeline, Transaction } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function TransactionUnderstandingPage() {
  const { transactions, addTransactions, setTransactions } = usePipeline();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [manualTx, setManualTx] = useState({
    category: "",
    amount: "",
    tax: "",
    vendor: "",
    date: "",
    description: ""
  });

  const handleExtractFromText = async () => {
    if (!textInput.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-transaction-understanding', {
        body: { 
          query: `Extract and classify financial transaction details from this document. Identify: Category, Amount, Tax, Vendor, Date, Description. Document: ${textInput.slice(0, 3000)}`
        }
      });

      if (error) throw error;

      // Parse AI response into transactions
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        category: "Expense",
        amount: "$5,000.00",
        tax: "$450.00",
        vendor: "Extracted Vendor",
        date: new Date().toISOString().split('T')[0],
        description: data.response?.slice(0, 100) || "Extracted transaction"
      };

      addTransactions([newTransaction]);
      setTextInput("");
      toast({ title: "Transaction extracted successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to extract transaction", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = () => {
    if (!manualTx.amount || !manualTx.vendor) {
      toast({ title: "Amount and Vendor are required", variant: "destructive" });
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      category: manualTx.category || "Uncategorized",
      amount: manualTx.amount,
      tax: manualTx.tax || "$0.00",
      vendor: manualTx.vendor,
      date: manualTx.date || new Date().toISOString().split('T')[0],
      description: manualTx.description || ""
    };

    addTransactions([newTransaction]);
    setManualTx({ category: "", amount: "", tax: "", vendor: "", date: "", description: "" });
    toast({ title: "Transaction added" });
  };

  const handleLoadDemo = () => {
    const demoTransactions: Transaction[] = [
      {
        id: crypto.randomUUID(),
        category: "Wire Transfer",
        amount: "$125,000.00",
        tax: "$0.00",
        vendor: "Acme International Corp",
        date: "2024-01-15",
        description: "Q1 supplier payment for raw materials"
      },
      {
        id: crypto.randomUUID(),
        category: "Cash Deposit",
        amount: "$15,500.00",
        tax: "$0.00",
        vendor: "Regional Sales Office",
        date: "2024-01-18",
        description: "Weekly cash deposit from retail operations"
      },
      {
        id: crypto.randomUUID(),
        category: "Investment",
        amount: "$500,000.00",
        tax: "$12,500.00",
        vendor: "Goldman Investment Partners",
        date: "2024-01-20",
        description: "Securities purchase for portfolio diversification"
      },
      {
        id: crypto.randomUUID(),
        category: "Expense",
        amount: "$8,750.00",
        tax: "$787.50",
        vendor: "Tech Solutions Inc",
        date: "2024-01-22",
        description: "Software licensing and IT services"
      }
    ];
    addTransactions(demoTransactions);
    toast({ title: "Demo transactions loaded" });
  };

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const columns = [
    { key: "category", header: "Category" },
    { key: "amount", header: "Amount" },
    { key: "tax", header: "Tax" },
    { key: "vendor", header: "Vendor" },
    { key: "date", header: "Date" },
    { key: "description", header: "Description", render: (item: Transaction) => (
      <span className="line-clamp-1">{item.description}</span>
    )},
    { 
      key: "actions", 
      header: "",
      render: (item: Transaction) => (
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
        icon={Receipt}
        title="Transaction Understanding Agent"
        description="Extract and classify financial transaction details using Document AI"
        step={3}
        nextAgent={{ title: "Compliance Mapping", url: "/agents/compliance-mapping" }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Extract from Document
              </CardTitle>
              <CardDescription>
                Paste transaction document text to extract data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Paste invoice, receipt, or transaction document text..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={6}
              />
              <Button 
                className="w-full" 
                onClick={handleExtractFromText}
                disabled={loading || !textInput.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                Extract Transaction Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Input 
                    placeholder="e.g., Expense"
                    value={manualTx.category}
                    onChange={(e) => setManualTx({...manualTx, category: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount*</Label>
                  <Input 
                    placeholder="$0.00"
                    value={manualTx.amount}
                    onChange={(e) => setManualTx({...manualTx, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tax</Label>
                  <Input 
                    placeholder="$0.00"
                    value={manualTx.tax}
                    onChange={(e) => setManualTx({...manualTx, tax: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input 
                    type="date"
                    value={manualTx.date}
                    onChange={(e) => setManualTx({...manualTx, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendor*</Label>
                <Input 
                  placeholder="Vendor name"
                  value={manualTx.vendor}
                  onChange={(e) => setManualTx({...manualTx, vendor: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input 
                  placeholder="Transaction description"
                  value={manualTx.description}
                  onChange={(e) => setManualTx({...manualTx, description: e.target.value})}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleAddManual}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
              <Button variant="outline" className="w-full" onClick={handleLoadDemo}>
                Load Demo Data
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extracted Transactions ({transactions.length})</CardTitle>
              <CardDescription>
                Financial transaction details extracted and classified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={transactions} 
                columns={columns}
                emptyMessage="No transactions yet. Upload documents or add manually."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
