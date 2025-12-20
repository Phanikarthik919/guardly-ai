// Local interfaces for the Automation feature to match the prompt's specific snake_case schema
// independent of the main app's PipelineContext to avoid breaking changes.

// Agent 1 Output / Agent 2 Input
export interface AutomationRegulation {
  regulation_id: string;
  name: string;
  effective_date: string;
  clauses: number;
  source_url: string;
  last_updated?: string;

  // For internal logic mapping if needed
  id?: string;
  title?: string;
  date?: string;
  source?: string;
}

// Agent 2 Output / Agent 4 Input
export interface AutomationClause {
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
export interface AutomationTransaction {
  transaction_id: string;
  amount: number;
  vendor_name: string;
  category: string;
  department?: string;
  tax_paid: number;
  bids_count?: number;
  documents_attached: string[];
  data_completeness?: number;
  missing_fields?: string[];

  // Internal helper
  id?: string;
}

// Agent 4 Output / Agent 5 Input
export interface AutomationViolation {
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

export interface AutomationComplianceResult {
  transaction_id: string;
  compliance_status: 'VIOLATION' | 'COMPLIANT';
  violations: AutomationViolation[];
  overall_risk_score: number;
  checked_at: string;
}

// Agent 5 Output
export interface AutomationRecommendation {
  violation_type: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  deadline: string;
}

export interface AutomationAuditReport {
  report_id: string;
  transaction_id: string;
  status: string;
  summary: string;
  violations: AutomationViolation[];
  recommendations: AutomationRecommendation[];
  risk_score: number;
  transaction_details?: {
    amount: number;
    vendor: string;
    category: string;
    tax_paid: number;
  };
}

// --- Agent 1 Data ---
export const sampleRegulations: AutomationRegulation[] = [
  {
    regulation_id: "2024_GST_CIRCULAR_045",
    name: "CGST applicability on infrastructure supplies",
    effective_date: "2024-12-01",
    clauses: 5,
    source_url: "https://gst.gov.in",
    last_updated: "2024-12-20",

    // Internal mapping helpers
    id: "2024_GST_CIRCULAR_045",
    title: "CGST applicability on infrastructure supplies",
    date: "2024-12-01",
    source: "https://gst.gov.in"
  },
  {
    regulation_id: "2024_PROCUREMENT_RULE_12",
    name: "Competitive Bidding Requirements for Public Procurement",
    effective_date: "2024-01-15",
    clauses: 3,
    source_url: "https://finance.gov.in",
    last_updated: "2024-01-20",

    id: "2024_PROCUREMENT_RULE_12",
    title: "Competitive Bidding Requirements for Public Procurement",
    date: "2024-01-15",
    source: "https://finance.gov.in"
  }
];

// --- Agent 2 Logic (Simulation) ---
export const runAgent2Simulation = (regs: AutomationRegulation[]): AutomationClause[] => {
  const clauses: AutomationClause[] = [];

  regs.forEach(reg => {
    if (reg.regulation_id === "2024_GST_CIRCULAR_045") {
      clauses.push({
        clause_id: "2024_GST_CIRCULAR_045_CLAUSE_1",
        regulation_id: "2024_GST_CIRCULAR_045",
        rule_name: "CGST@18% on infrastructure supplies",
        transaction_types: ["procurement", "construction"],
        amount_threshold: 1000000,
        tax_rate: 18,
        required_documents: ["vendor_cert", "invoice", "project_order"],
        severity: "high",
        description: "For construction purchases >₹10L, GST must be 18%"
      });
    } else if (reg.regulation_id === "2024_PROCUREMENT_RULE_12") {
       clauses.push({
        clause_id: "2024_PROCUREMENT_RULE_12_CLAUSE_1",
        regulation_id: "2024_PROCUREMENT_RULE_12",
        rule_name: "Minimum 3 competitive bids",
        transaction_types: ["procurement", "construction", "services"],
        amount_threshold: 1000000, // > 10L
        min_bids: 3,
        required_documents: ["bid_summary", "comparative_statement"],
        severity: "high",
        description: "Procurement >₹10L requires at least 3 competitive bids."
      });
    }
  });
  return clauses;
};

// --- Agent 3 Data (Simulation) ---
export const sampleTransactions: AutomationTransaction[] = [
  {
    transaction_id: "TXN_2024_FINANCE_00145",
    amount: 2500000,
    vendor_name: "ABC Infrastructure Ltd.",
    category: "construction",
    department: "PWD_TELANGANA",
    tax_paid: 125000,
    bids_count: 2,
    documents_attached: ["invoice.pdf", "grn.pdf"], // Missing project_order
    data_completeness: 85,
    missing_fields: ["project_order"],
    id: "TXN_2024_FINANCE_00145"
  },
  {
    transaction_id: "TXN_2024_FINANCE_00146",
    amount: 500000, // 5L (< 10L threshold)
    vendor_name: "TechSoft Solutions",
    category: "software",
    department: "IT_DEPT",
    tax_paid: 90000, // 18% of 5L = 90k
    bids_count: 1,
    documents_attached: ["invoice.pdf", "contract.pdf"],
    data_completeness: 100,
    missing_fields: [],
    id: "TXN_2024_FINANCE_00146"
  }
];

// --- Agent 4 Logic (CORE Compliance Mapping) ---
export const runAgent4Simulation = (clauses: AutomationClause[], transactions: AutomationTransaction[]): AutomationComplianceResult[] => {
  return transactions.map(txn => {
    const violations: AutomationViolation[] = [];

    clauses.forEach(clause => {
      // 1. Check applicability
      if (!clause.transaction_types.includes(txn.category)) return;
      if (txn.amount < clause.amount_threshold) return;

      // 2. TAX_MISMATCH
      if (clause.tax_rate !== undefined) {
        const expectedTax = (txn.amount * clause.tax_rate) / 100;
        // Allow 5% margin of error as per prompt "if tax_paid < expected_tax × 0.95"
        if (txn.tax_paid < expectedTax * 0.95) {
          violations.push({
            type: "TAX_MISMATCH",
            clause_id: clause.clause_id,
            severity: clause.severity,
            description: `Tax mismatch: Expected ₹${expectedTax}, claimed ₹${txn.tax_paid}`,
            expected_tax: expectedTax,
            claimed_tax: txn.tax_paid,
            corrective_action: `Adjust tax to ₹${expectedTax}`
          });
        }
      }

      // 3. BIDDING_REQUIREMENT
      if (clause.min_bids !== undefined) {
        const actualBids = txn.bids_count || 0;
        if (actualBids < clause.min_bids) {
          violations.push({
            type: "BIDDING_REQUIREMENT",
            clause_id: clause.clause_id,
            severity: clause.severity,
            description: `Requires ${clause.min_bids} competitive bids; only ${actualBids} found`,
            expected_bids: clause.min_bids,
            actual_bids: actualBids,
            corrective_action: `Obtain ${clause.min_bids - actualBids} more competitive bid(s)`
          });
        }
      }

      // 4. MISSING_DOCUMENT
      if (clause.required_documents && clause.required_documents.length > 0) {
         clause.required_documents.forEach(reqDoc => {
            const hasDoc = txn.documents_attached.some(doc => doc.toLowerCase().includes(reqDoc.toLowerCase()));
            if (!hasDoc) {
               violations.push({
                 type: "MISSING_DOCUMENT",
                 clause_id: clause.clause_id,
                 severity: clause.severity,
                 required_doc: reqDoc,
                 description: `Required document '${reqDoc}' is missing`,
                 corrective_action: `Attach ${reqDoc} to transaction`
               });
            }
         });
      }
    });

    const violationCount = violations.length;
    const riskScore = Math.min(violationCount * 0.3, 0.99);

    return {
      transaction_id: txn.transaction_id,
      compliance_status: violationCount > 0 ? "VIOLATION" : "COMPLIANT",
      violations: violations,
      overall_risk_score: parseFloat(riskScore.toFixed(2)),
      checked_at: new Date().toISOString()
    };
  });
};

// --- Agent 5 Logic (Auditor Assistant) ---
export const runAgent5Simulation = (results: AutomationComplianceResult[], transactions: AutomationTransaction[]): AutomationAuditReport[] => {
  return results.filter(r => r.compliance_status === "VIOLATION").map(res => {
    const txn = transactions.find(t => t.transaction_id === res.transaction_id)!;

    const recommendations: AutomationRecommendation[] = res.violations.map(v => ({
      violation_type: v.type,
      action: v.corrective_action || "Review transaction",
      priority: v.severity === "high" ? "HIGH" : "MEDIUM",
      deadline: v.severity === "high" ? "Immediate" : "7-14 days"
    }));

    return {
      report_id: `RPT_${res.transaction_id}`,
      transaction_id: res.transaction_id,
      status: res.compliance_status,
      summary: `Transaction ${res.transaction_id} has ${res.violations.length} compliance violation(s). Risk level: ${Math.round(res.overall_risk_score * 100)}%. Immediate corrective actions required.`,
      violations: res.violations,
      recommendations: recommendations,
      risk_score: res.overall_risk_score,
      transaction_details: {
        amount: txn.amount,
        vendor: txn.vendor_name,
        category: txn.category,
        tax_paid: txn.tax_paid
      }
    };
  });
};
