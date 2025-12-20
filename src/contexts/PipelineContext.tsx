import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Regulation {
  id: string;
  source: string;
  title: string;
  date: string;
  version: string;
  content: string;
  url?: string;
}

export interface ParsedClause {
  id: string;
  regulationId: string;
  clauseId: string;
  rule: string;
  conditions: string;
  penalties: string;
}

export interface Transaction {
  id: string;
  category: string;
  amount: string;
  tax: string;
  vendor: string;
  date: string;
  description: string;
}

export interface ComplianceResult {
  id: string;
  transactionId: string;
  clauseId: string;
  status: 'compliant' | 'violation' | 'warning' | 'missing_docs';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  missingDocs?: string[];
}

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
    setRegulations(prev => [...prev, ...regs]);
  };

  const addParsedClauses = (clauses: ParsedClause[]) => {
    setParsedClauses(prev => [...prev, ...clauses]);
  };

  const addTransactions = (txns: Transaction[]) => {
    setTransactions(prev => [...prev, ...txns]);
  };

  const addComplianceResults = (results: ComplianceResult[]) => {
    setComplianceResults(prev => [...prev, ...results]);
  };

  const addAuditReport = (report: AuditReport) => {
    setAuditReports(prev => [...prev, report]);
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
