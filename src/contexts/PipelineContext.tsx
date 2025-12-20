import React, { createContext, useContext, useState, ReactNode } from 'react';

// Agent 1 Output / Agent 2 Input
export interface Regulation {
  id: string;
  source: string;
  title: string;
  date: string;
  version: string;
  content: string;
  url?: string;
  last_updated?: string;
}

// Agent 2 Output - Parsed legal clauses
export interface ParsedClause {
  id: string;
  regulationId: string;
  clauseId: string;
  rule: string;
  conditions: string;
  penalties: string;
}

// Agent 3 Output - Transaction data
export interface Transaction {
  id: string;
  category: string;
  amount: string;
  tax: string;
  vendor: string;
  date: string;
  description: string;
}

// Agent 4 Output - Compliance check result
export interface ComplianceResult {
  id: string;
  transactionId: string;
  clauseId: string;
  status: 'compliant' | 'violation' | 'warning' | 'missing_docs';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  missingDocs?: string[];
}

// Agent 5 Output - Final audit report
export interface AuditReport {
  id: string;
  generatedAt: string;
  summary: {
    totalChecked: number;
    compliant: number;
    violations: number;
    warnings: number;
  };
  details: {
    complianceResultId: string;
    clauseReference: string;
    reasoning: string;
    correctiveAction: string;
  }[];
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
      const newIds = new Set(clauses.map(c => c.clauseId));
      return [...prev.filter(c => !newIds.has(c.clauseId)), ...clauses];
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
      const newIds = new Set(results.map(r => r.transactionId));
      return [...prev.filter(r => !newIds.has(r.transactionId)), ...results];
    });
  };

  const addAuditReport = (report: AuditReport) => {
    setAuditReports(prev => {
      const newIds = new Set([report.id]);
      return [...prev.filter(r => !newIds.has(r.id)), report];
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
