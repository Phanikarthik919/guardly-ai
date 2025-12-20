import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import { useAgentDemo } from "@/hooks/useAgentDemo";

type AgentType = 'regulation-monitor' | 'legal-parser' | 'transaction-understanding' | 'compliance-mapping' | 'auditor-assistant';

interface AgentConfig {
  title: string;
  description: string;
  placeholder: string;
  sampleInput: string;
}

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'regulation-monitor': {
    title: 'Regulation Monitoring Agent',
    description: 'Fetches and indexes latest rules from government portals. Enter a query about regulations or a specific portal to monitor.',
    placeholder: 'e.g., "What are the latest GST circular updates from CBIC?" or "Monitor SEBI regulations for FPI compliance"',
    sampleInput: 'What are the latest GST circular updates from CBIC in the last quarter? Focus on changes affecting government procurement transactions.',
  },
  'legal-parser': {
    title: 'Legal Parsing Agent',
    description: 'Converts unstructured regulations into machine-readable compliance clauses. Paste regulatory text to parse.',
    placeholder: 'Paste regulatory text, circular content, or legal provisions here...',
    sampleInput: `Section 12 of CGST Act: A registered person shall issue a tax invoice for every supply of goods or services before or at the time of—
(a) removal of goods for supply to the recipient, where the supply involves movement of goods; or
(b) delivery of goods or making available thereof to the recipient, in any other case.
The invoice shall contain particulars as prescribed and shall be serially numbered within the financial year.
Failure to issue invoice shall attract penalty of Rs. 10,000 or 100% of tax evaded, whichever is higher.`,
  },
  'transaction-understanding': {
    title: 'Transaction Understanding Agent',
    description: 'Extracts and classifies financial transaction details using Document AI. Enter transaction or invoice details.',
    placeholder: 'Enter transaction details, invoice text, or document content...',
    sampleInput: `Invoice No: INV-2024-00587
Date: 15-Dec-2024
Vendor: ABC Technologies Pvt Ltd
GSTIN: 27AAACA1234A1ZZ
Description: IT Hardware - Laptops (10 units)
Unit Price: Rs. 65,000
Total: Rs. 6,50,000
CGST @9%: Rs. 58,500
SGST @9%: Rs. 58,500
Grand Total: Rs. 7,67,000
Payment Terms: Within 30 days
Bank: State Bank of India
Account: 1234567890`,
  },
  'compliance-mapping': {
    title: 'Compliance Mapping Agent',
    description: 'RAG-based matching of transactions against relevant legal frameworks. Enter transaction details to check compliance.',
    placeholder: 'Describe the transaction for compliance mapping...',
    sampleInput: `Transaction Type: Procurement of IT Services
Amount: Rs. 25,00,000
Vendor: Foreign Company (USA)
Payment: USD Wire Transfer
Purpose: Cloud hosting services for 1 year
Department: Ministry of Electronics and IT
Procurement Method: Direct Purchase (single vendor)
Contract Duration: 12 months with auto-renewal`,
  },
  'auditor-assistant': {
    title: 'Auditor Assistant Agent',
    description: 'Generates explainable audit reports with corrective recommendations. Enter compliance findings or transaction data.',
    placeholder: 'Enter compliance data or findings for audit report generation...',
    sampleInput: `Audit Subject: Procurement of Office Equipment
Department: District Collector Office, Pune
Period: Q3 FY 2024-25
Findings:
1. Invoice dated 01-Oct-2024 for Rs. 4,80,000 - No GEM quote attached
2. Vendor registration certificate expired on 15-Sep-2024
3. Three quotations not obtained for items above Rs. 25,000
4. TDS deduction delayed by 15 days
5. GST Input credit claimed without valid e-invoice
Total Transactions Reviewed: 45
Non-compliant Transactions: 8`,
  },
};

interface AgentDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentType: AgentType;
}

export function AgentDemoModal({ isOpen, onClose, agentType }: AgentDemoModalProps) {
  const [input, setInput] = useState('');
  const { response, isLoading, error, runAgent, clearResponse } = useAgentDemo(agentType);
  const config = AGENT_CONFIGS[agentType];

  useEffect(() => {
    if (!isOpen) {
      setInput('');
      clearResponse();
    }
  }, [isOpen, clearResponse]);

  const handleRun = () => {
    if (input.trim()) {
      runAgent(input);
    }
  };

  const handleUseSample = () => {
    setInput(config.sampleInput);
  };

  const handleReset = () => {
    setInput('');
    clearResponse();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Input</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseSample}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Use sample input
              </Button>
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.placeholder}
              className="min-h-[120px] bg-secondary/50 border-border resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRun}
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Agent
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="border-border"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Output Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            <label className="text-sm font-medium text-foreground mb-2">Output</label>
            <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] rounded-lg bg-secondary/30 border border-border p-4">
              {error ? (
                <div className="text-destructive">{error}</div>
              ) : response ? (
                <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">{response}</pre>
              ) : (
                <div className="text-muted-foreground text-sm italic">
                  {isLoading ? 'Agent is processing...' : 'Output will appear here after running the agent.'}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
