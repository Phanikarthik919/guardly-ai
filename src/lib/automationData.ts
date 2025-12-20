import {
  Regulation,
  ParsedClause,
  Transaction,
  ComplianceResult,
  AuditReport,
  Violation,
  Recommendation
} from "@/contexts/PipelineContext";

// --- Agent 1 Data ---
export const sampleRegulations: Regulation[] = [
  {
    id: "2024_GST_CIRCULAR_045",
    title: "CGST applicability on infrastructure supplies",
    date: "2024-12-01",
    version: "1.0",
    content: "Circular regarding CGST rates for construction and infrastructure projects.",
    source: "https://gst.gov.in",
    last_updated: "2024-12-20"
  },
  {
    id: "2024_PROCUREMENT_RULE_12",
    title: "Competitive Bidding Requirements for Public Procurement",
    date: "2024-01-15",
    version: "2.0",
    content: "Guidelines for minimum number of bids required for public tenders.",
    source: "https://finance.gov.in",
    last_updated: "2024-01-20"
  }
];

// --- Agent 2 Logic (Simulation) ---
export const runAgent2Simulation = (regs: Regulation[]): ParsedClause[] => {
  const clauses: ParsedClause[] = [];

  regs.forEach(reg => {
    if (reg.id === "2024_GST_CIRCULAR_045") {
      clauses.push({
        id: "2024_GST_CIRCULAR_045_CLAUSE_1",
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
    } else if (reg.id === "2024_PROCUREMENT_RULE_12") {
       clauses.push({
        id: "2024_PROCUREMENT_RULE_12_CLAUSE_1",
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
export const sampleTransactions: Transaction[] = [
  {
    id: "TXN_2024_FINANCE_00145",
    amount: 2500000,
    vendor_name: "ABC Infrastructure Ltd.",
    category: "construction",
    department: "PWD_TELANGANA",
    tax_paid: 125000,
    bids_count: 2,
    documents_attached: ["invoice.pdf", "grn.pdf"], // Missing project_order
    date: "2024-12-25",
    data_completeness: 85,
    missing_fields: ["project_order"]
  },
  {
    id: "TXN_2024_FINANCE_00146",
    amount: 500000, // 5L (< 10L threshold)
    vendor_name: "TechSoft Solutions",
    category: "software",
    department: "IT_DEPT",
    tax_paid: 90000, // 18% of 5L = 90k
    bids_count: 1,
    documents_attached: ["invoice.pdf", "contract.pdf"],
    date: "2024-12-26",
    data_completeness: 100,
    missing_fields: []
  }
];

// --- Agent 4 Logic (CORE Compliance Mapping) ---
export const runAgent4Simulation = (clauses: ParsedClause[], transactions: Transaction[]): ComplianceResult[] => {
  return transactions.map(txn => {
    const violations: Violation[] = [];

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
         // This logic is tricky because "documents_attached" in transaction are filenames (e.g., "invoice.pdf"),
         // while "required_documents" in clause are types (e.g., "invoice").
         // For simulation, we'll check if any attached document *contains* the required type string.
         // OR, consistent with sample data: TXN_00145 is missing "project_order".

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
      transaction_id: txn.id,
      compliance_status: violationCount > 0 ? "VIOLATION" : "COMPLIANT",
      violations: violations,
      overall_risk_score: parseFloat(riskScore.toFixed(2)),
      checked_at: new Date().toISOString()
    };
  });
};

// --- Agent 5 Logic (Auditor Assistant) ---
export const runAgent5Simulation = (results: ComplianceResult[], transactions: Transaction[]): AuditReport[] => {
  return results.filter(r => r.compliance_status === "VIOLATION").map(res => {
    const txn = transactions.find(t => t.id === res.transaction_id)!;

    const recommendations: Recommendation[] = res.violations.map(v => ({
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
