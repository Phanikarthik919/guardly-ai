import {
  Regulation,
  ParsedClause,
  Transaction,
  ComplianceResult,
  AuditReport,
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

  regs.forEach((reg, index) => {
    if (reg.id === "2024_GST_CIRCULAR_045") {
      clauses.push({
        id: crypto.randomUUID(),
        regulationId: reg.id,
        clauseId: "GST_CIRCULAR_001",
        rule: "IF entity_type = 'registered_business' AND transaction_value > 1000000 AND category = 'construction' THEN apply_tax_rate = 18%",
        conditions: "Applicable for construction purchases exceeding ₹10L under GST framework. Required documents: vendor certificate, invoice, project order.",
        penalties: "Non-compliance penalty: Fine up to ₹10,00,000 or 1% of transaction value. Tax shortfall attracts 18% interest per annum."
      });
    } else if (reg.id === "2024_PROCUREMENT_RULE_12") {
      clauses.push({
        id: crypto.randomUUID(),
        regulationId: reg.id,
        clauseId: "PROCUREMENT_001",
        rule: "IF transaction_value > 1000000 AND category IN ['procurement', 'construction', 'services'] THEN minimum_bids_required = 3",
        conditions: "All procurement exceeding ₹10L requires minimum 3 competitive bids. Required: bid summary, comparative statement.",
        penalties: "Procurement without adequate bids may be voided. Officials may face disciplinary action under CCS rules."
      });
    }
  });
  return clauses;
};

// --- Agent 3 Data (Simulation) ---
export const sampleTransactions: Transaction[] = [
  {
    id: "TXN_2024_FINANCE_00145",
    amount: "₹25,00,000",
    tax: "₹1,25,000",
    vendor: "ABC Infrastructure Ltd.",
    category: "construction",
    date: "2024-12-25",
    description: "Infrastructure construction project - Phase 1 materials procurement"
  },
  {
    id: "TXN_2024_FINANCE_00146",
    amount: "₹5,00,000",
    tax: "₹90,000",
    vendor: "TechSoft Solutions",
    category: "software",
    date: "2024-12-26",
    description: "Annual software license renewal and maintenance"
  }
];

// --- Agent 4 Logic (CORE Compliance Mapping) ---
export const runAgent4Simulation = (clauses: ParsedClause[], transactions: Transaction[]): ComplianceResult[] => {
  return transactions.map(txn => {
    // Parse amount for comparison
    const amountValue = parseFloat(txn.amount.replace(/[₹,]/g, ''));
    const taxValue = parseFloat(txn.tax.replace(/[₹,]/g, ''));
    
    // Simple compliance check simulation
    const applicableClauses = clauses.filter(c => 
      c.rule.toLowerCase().includes(txn.category.toLowerCase()) || 
      c.conditions.toLowerCase().includes(txn.category.toLowerCase())
    );

    if (applicableClauses.length === 0) {
      return {
        id: crypto.randomUUID(),
        transactionId: txn.id,
        clauseId: clauses[0]?.id || 'N/A',
        status: 'compliant' as const,
        riskLevel: 'low' as const,
        reasoning: `Transaction category '${txn.category}' does not fall under any monitored regulatory clauses.`
      };
    }

    // Check for tax compliance
    const expectedTax = amountValue * 0.18;
    const taxMismatch = taxValue < expectedTax * 0.95;

    if (taxMismatch && amountValue > 1000000) {
      return {
        id: crypto.randomUUID(),
        transactionId: txn.id,
        clauseId: applicableClauses[0].id,
        status: 'violation' as const,
        riskLevel: 'high' as const,
        reasoning: `Tax mismatch detected. Expected ₹${expectedTax.toLocaleString('en-IN')} (18% GST), but claimed ₹${taxValue.toLocaleString('en-IN')}. This violates ${applicableClauses[0].clauseId}.`
      };
    }

    return {
      id: crypto.randomUUID(),
      transactionId: txn.id,
      clauseId: applicableClauses[0].id,
      status: 'compliant' as const,
      riskLevel: 'low' as const,
      reasoning: `Transaction complies with ${applicableClauses[0].clauseId}. Tax calculation verified.`
    };
  });
};

// --- Agent 5 Logic (Auditor Assistant) ---
export const runAgent5Simulation = (results: ComplianceResult[], transactions: Transaction[]): AuditReport[] => {
  const violations = results.filter(r => r.status === 'violation');
  const warnings = results.filter(r => r.status === 'warning');
  const compliant = results.filter(r => r.status === 'compliant');

  return [{
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    summary: {
      totalChecked: results.length,
      compliant: compliant.length,
      violations: violations.length,
      warnings: warnings.length
    },
    details: results.map(r => {
      const txn = transactions.find(t => t.id === r.transactionId);
      return {
        complianceResultId: r.id,
        clauseReference: r.clauseId,
        reasoning: r.reasoning,
        correctiveAction: r.status === 'violation'
          ? `Immediate review required for ${txn?.vendor}. Rectify tax calculation and re-submit with corrected documentation.`
          : r.status === 'warning'
          ? `Monitor ${txn?.vendor} transaction. Consider additional documentation.`
          : `No action required for ${txn?.vendor}. Continue standard monitoring.`
      };
    })
  }];
};
