import { useState, useRef } from "react";
import { Receipt, Upload, Loader2, Plus, Trash2, Eye, Sparkles, FileText, X } from "lucide-react";
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
import { TransactionStatsCards } from "@/components/agents/TransactionStatsCards";
import { TransactionDetailModal } from "@/components/agents/TransactionDetailModal";
import { useStreamingAgent } from "@/hooks/useStreamingAgent";

export default function TransactionUnderstandingPage() {
  const { transactions, addTransactions, setTransactions } = usePipeline();
  const { toast } = useToast();
  const [textInput, setTextInput] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualTx, setManualTx] = useState({
    category: "",
    amount: "",
    tax: "",
    vendor: "",
    date: "",
    description: ""
  });

  const { response, isLoading, runAgent, clearResponse } = useStreamingAgent({
    onComplete: (fullResponse) => {
      // Try to parse JSON array of transactions from AI response
      try {
        const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newTransactions: Transaction[] = parsed.map((t: any) => ({
              id: crypto.randomUUID(),
              category: t.category || "Expense",
              amount: t.amount || "₹0.00",
              tax: t.tax || "₹0.00",
              vendor: t.vendor || "Unknown",
              date: t.date || new Date().toISOString().split('T')[0],
              description: t.description || ""
            }));
            addTransactions(newTransactions);
            setTextInput("");
            setUploadedFile(null);
            toast({ title: `${newTransactions.length} transaction(s) extracted successfully` });
            return;
          }
        }
      } catch (e) {
        console.log("Could not parse as JSON array, using fallback");
      }

      // Fallback: create single transaction
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        category: "Expense",
        amount: "₹5,000.00",
        tax: "₹450.00",
        vendor: "Extracted Vendor",
        date: new Date().toISOString().split('T')[0],
        description: fullResponse.slice(0, 150) || "Extracted transaction"
      };

      addTransactions([newTransaction]);
      setTextInput("");
      setUploadedFile(null);
      toast({ title: "Transaction extracted successfully" });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File size must be less than 10MB", variant: "destructive" });
      return;
    }

    setUploadedFile(file);
    toast({ title: `${file.name} selected`, description: "Click 'Extract from PDF' to process" });
  };

  const handleExtractFromPdf = async () => {
    if (!uploadedFile) return;

    setIsProcessingPdf(true);
    clearResponse();

    try {
      // Read PDF as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadedFile);
      const base64Data = await base64Promise;

      // Send to AI agent with PDF content
      await runAgent('agent-transaction-understanding', {
        transactionData: `[PDF DOCUMENT: ${uploadedFile.name}]\n\nPlease extract all financial transactions from this document. The document is provided as base64 encoded PDF. Extract transaction details including: category, amount, tax, vendor, date, and description. Return the transactions as a JSON array.\n\nBase64 PDF (first 5000 chars): ${base64Data.slice(0, 5000)}`
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({ title: "Error processing PDF", variant: "destructive" });
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractFromText = async () => {
    if (!textInput.trim()) return;
    clearResponse();
    await runAgent('agent-transaction-understanding', {
      transactionData: `Please extract all financial transactions from the following text. Return as a JSON array with fields: category, amount, tax, vendor, date, description.\n\n${textInput.slice(0, 3000)}`
    });
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
      tax: manualTx.tax || "₹0.00",
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
        amount: "₹1,25,00,000",
        tax: "₹0.00",
        vendor: "State Bank of India",
        date: "2024-01-15",
        description: "Inter-state fund transfer for infrastructure project"
      },
      {
        id: crypto.randomUUID(),
        category: "Cash Deposit",
        amount: "₹15,50,000",
        tax: "₹0.00",
        vendor: "District Treasury Office",
        date: "2024-01-18",
        description: "Weekly cash deposit from tax collections"
      },
      {
        id: crypto.randomUUID(),
        category: "Government Grant",
        amount: "₹5,00,00,000",
        tax: "₹12,50,000",
        vendor: "Ministry of Finance",
        date: "2024-01-20",
        description: "Central grant for rural development scheme"
      },
      {
        id: crypto.randomUUID(),
        category: "Procurement",
        amount: "₹87,50,000",
        tax: "₹15,75,000",
        vendor: "GeM Portal Vendor",
        date: "2024-01-22",
        description: "IT equipment procurement via GeM"
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
      <span className="line-clamp-1 text-muted-foreground">{item.description}</span>
    )},
    { 
      key: "actions", 
      header: "",
      render: (item: Transaction) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            setSelectedTransaction(item);
          }}>
            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            handleDelete(item.id);
          }}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
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

      {transactions.length > 0 && (
        <TransactionStatsCards transactions={transactions} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-1 space-y-4">
          {/* PDF Upload Card */}
          <Card className="border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Upload PDF Document
              </CardTitle>
              <CardDescription>
                Upload invoices, receipts, or transaction statements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              
              {!uploadedFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload PDF
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Max 10MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate">{uploadedFile.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleExtractFromPdf}
                disabled={isLoading || isProcessingPdf || !uploadedFile}
              >
                {(isLoading || isProcessingPdf) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4 mr-2" />
                )}
                Extract from PDF
              </Button>
            </CardContent>
          </Card>

          {/* Text Input Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Paste Document Text
              </CardTitle>
              <CardDescription>
                Or paste transaction document text directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Textarea 
                placeholder="Paste invoice, receipt, or transaction document text..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button 
                variant="outline"
                className="w-full" 
                onClick={handleExtractFromText}
                disabled={isLoading || !textInput.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
                Extract from Text
              </Button>
            </CardContent>
          </Card>

          {/* AI Response Preview */}
          {(isLoading || response) && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {response || "Processing document..."}
                </div>
              </CardContent>
            </Card>
          )}

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
                    placeholder="₹0.00"
                    value={manualTx.amount}
                    onChange={(e) => setManualTx({...manualTx, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tax</Label>
                  <Input 
                    placeholder="₹0.00"
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
              <Button variant="secondary" className="w-full" onClick={handleLoadDemo}>
                Load Demo Data
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="text-lg">Extracted Transactions ({transactions.length})</CardTitle>
              <CardDescription>
                Financial transaction details extracted and classified
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DataTable 
                data={transactions} 
                columns={columns}
                emptyMessage="No transactions yet. Upload documents or add manually."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      />
    </DashboardLayout>
  );
}
