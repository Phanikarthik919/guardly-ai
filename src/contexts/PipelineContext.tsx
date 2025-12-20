import React, { createContext, useContext, useState, ReactNode } from 'react';

// Agent 1 Output / Agent 2 Input
export interface Regulation {
  id: string; // regulation_id
  source: string;
  title: string; // name
  date: string; // effective_date
  version: string;
  content: string; // clauses (count) or full text
  url?: string; // source_url
  last_updated?: string;
}

// Agent 2 Output / Agent 4 Input
export interface ParsedClause {
  id: string; // Unique ID for React keys
  clause_id: string;
  regulation_id: string;
  rule_name: string;
  transaction_types: string[];
  amount_threshold: number;
  tax_rate?: number;
  min_bids?: number;
  required_documents: string[];
  severity: 'high' | 'medium' | 'low';
  description?: string;
}

// Agent 3 Output / Agent 4 Input
export interface Transaction {
  id: string; // transaction_id
  amount: number;
  vendor_name: string;
  category: string;
  department?: string;
  tax_paid: number;
  bids_count?: number; // derived from bids array in prompt
  documents_attached: string[];
  date: string;
  description?: string;
  data_completeness?: number;
  missing_fields?: string[];
}

// Agent 4 Output / Agent 5 Input
export interface Violation {
  type: 'TAX_MISMATCH' | 'BIDDING_REQUIREMENT' | 'MISSING_DOCUMENT';
  clause_id: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  expected_tax?: number;
  claimed_tax?: number;
  expected_bids?: number;
  actual_bids?: number;
  required_doc?: string;
  corrective_action?: string;
}

export interface ComplianceResult {
  transaction_id: string;
  compliance_status: 'VIOLATION' | 'COMPLIANT';
  violations: Violation[];
  overall_risk_score: number;
  checked_at: string;
}

// Agent 5 Output
export interface Recommendation {
  violation_type: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: string;
}

export interface AuditReport {
  report_id: string;
  transaction_id: string;
  status: string;
  summary: string;
  violations: Violation[];
  recommendations: Recommendation[];
  risk_score: number;
  transaction_details?: {
    amount: number;
    vendor: string;
    category: string;
    tax_paid: number;
  };
}

interface PipelineContextType {
  regulations: Regulation[];
  setRegulations: (regs: Regulation[]) => void;
  addRegulations: (regs: Regulation[]) => void;
  
  parsedClauses: ParsedClause[];
  setParsedClauses: (clauses: ParsedClause[]) => void;
  addParsedClauses: (clauses: ParsedClause[]) => void;
  
  transactions: Transaction[];
  setTransactions: (txns: Transaction[]) => void;
  addTransactions: (txns: Transaction[]) => void;
  
  complianceResults: ComplianceResult[];
  setComplianceResults: (results: ComplianceResult[]) => void;
  addComplianceResults: (results: ComplianceResult[]) => void;
  
  auditReports: AuditReport[];
  setAuditReports: (reports: AuditReport[]) => void;
  addAuditReport: (report: AuditReport) => void;
  
  clearAll: () => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [parsedClauses, setParsedClauses] = useState<ParsedClause[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);

  const addRegulations = (regs: Regulation[]) => {
    setRegulations(prev => {
      // Avoid duplicates
      const newIds = new Set(regs.map(r => r.id));
      return [...prev.filter(r => !newIds.has(r.id)), ...regs];
    });
  };

  const addParsedClauses = (clauses: ParsedClause[]) => {
    setParsedClauses(prev => {
      const newIds = new Set(clauses.map(c => c.clause_id));
      return [...prev.filter(c => !newIds.has(c.clause_id)), ...clauses];
    });
  };

  const addTransactions = (txns: Transaction[]) => {
    setTransactions(prev => {
      const newIds = new Set(txns.map(t => t.id));
      return [...prev.filter(t => !newIds.has(t.id)), ...txns];
    });
  };

  const addComplianceResults = (results: ComplianceResult[]) => {
    setComplianceResults(prev => {
      const newIds = new Set(results.map(r => r.transaction_id));
      return [...prev.filter(r => !newIds.has(r.transaction_id)), ...results];
    });
  };

  const addAuditReport = (report: AuditReport) => {
    setAuditReports(prev => {
      const newIds = new Set([report.report_id]);
      return [...prev.filter(r => !newIds.has(r.report_id)), report];
    });
  };

  const clearAll = () => {
    setRegulations([]);
    setParsedClauses([]);
    setTransactions([]);
    setComplianceResults([]);
    setAuditReports([]);
  };

  return (
    <PipelineContext.Provider value={{
      regulations,
      setRegulations,
      addRegulations,
      parsedClauses,
      setParsedClauses,
      addParsedClauses,
      transactions,
      setTransactions,
      addTransactions,
      complianceResults,
      setComplianceResults,
      addComplianceResults,
      auditReports,
      setAuditReports,
      addAuditReport,
      clearAll,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
