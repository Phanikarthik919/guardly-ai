import React, { createContext, useContext, useState, ReactNode } from 'react';

// --- DATA MODELS ---

export interface Regulation {
  id: string;
  name: string;
  description: string;
  effective_date: string;
  raw_content: string;
  source_url?: string;
  // Legacy fields for compatibility if needed
  source?: string;
  title?: string;
  date?: string;
  version?: string;
  content?: string;
  url?: string;
}

export interface ComplianceClause {
  id: string;
  regulation_id: string;
  rule_name: string;
  description: string;
  category: 'TAX' | 'BIDDING' | 'DOCUMENTATION' | 'OTHER';
  parameters: {
    rate?: number;
    min_amount?: number;
    min_bids?: number;
    applicable_types?: string[];
    required_docs?: string[];
  };
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Transaction {
  id: string;
  amount: number;
  vendor_name: string;
  category: string;
  date: string;
  tax_paid: number;
  bids_received: number;
  documents: string[];
  status: 'pending' | 'processed';
}

export interface Violation {
  rule_id: string;
  type: 'TAX_MISMATCH' | 'BIDDING_REQUIREMENT' | 'MISSING_DOCUMENT' | 'OTHER';
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ComplianceResult {
  transaction_id: string;
  is_compliant: boolean;
  violations: Violation[];
  risk_score: number; // 0.0 to 1.0
  timestamp: string;
}

export interface AuditReport {
  id: string;
  transaction_id: string;
  generated_at: string;
  summary: string;
  risk_assessment: string;
  recommendations: string[];
  status: 'DRAFT' | 'FINAL';
}

// --- CONTEXT ---

interface PipelineContextType {
  regulations: Regulation[];
  setRegulations: (regs: Regulation[]) => void;
  
  clauses: ComplianceClause[];
  setClauses: (clauses: ComplianceClause[]) => void;
  
  transactions: Transaction[];
  setTransactions: (txns: Transaction[]) => void;
  
  results: ComplianceResult[];
  setResults: (results: ComplianceResult[]) => void;
  
  reports: AuditReport[];
  setReports: (reports: AuditReport[]) => void;

  clearAll: () => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [clauses, setClauses] = useState<ComplianceClause[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [results, setResults] = useState<ComplianceResult[]>([]);
  const [reports, setReports] = useState<AuditReport[]>([]);

  const clearAll = () => {
    setRegulations([]);
    setClauses([]);
    setTransactions([]);
    setResults([]);
    setReports([]);
  };

  return (
    <PipelineContext.Provider value={{
      regulations,
      setRegulations,
      clauses,
      setClauses,
      transactions,
      setTransactions,
      results,
      setResults,
      reports,
      setReports,
      clearAll
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
