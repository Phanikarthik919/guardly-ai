import { Transaction, ComplianceClause, Violation, ComplianceResult } from "@/contexts/PipelineContext";

export function checkCompliance(transaction: Transaction, clauses: ComplianceClause[]): ComplianceResult {
  const violations: Violation[] = [];
  let riskScore = 0;

  clauses.forEach((clause) => {
    // 1. Check Tax Mismatch
    if (clause.category === "TAX" && clause.parameters.applicable_types?.includes(transaction.category)) {
      if (transaction.amount >= (clause.parameters.min_amount || 0)) {
        const expectedTax = transaction.amount * (clause.parameters.rate || 0);
        // Allow small rounding difference
        if (Math.abs(transaction.tax_paid - expectedTax) > 100) {
          violations.push({
            rule_id: clause.id,
            type: "TAX_MISMATCH",
            description: `Expected tax ₹${expectedTax.toLocaleString()}, paid ₹${transaction.tax_paid.toLocaleString()}`,
            severity: clause.severity
          });
          riskScore += 0.4;
        }
      }
    }

    // 2. Check Bidding Requirements
    if (clause.category === "BIDDING") {
      if (transaction.amount >= (clause.parameters.min_amount || 0)) {
        if (transaction.bids_received < (clause.parameters.min_bids || 0)) {
          violations.push({
            rule_id: clause.id,
            type: "BIDDING_REQUIREMENT",
            description: `Required ${clause.parameters.min_bids} bids, found ${transaction.bids_received}`,
            severity: clause.severity
          });
          riskScore += 0.3;
        }
      }
    }

    // 3. Check Documentation
    if (clause.category === "DOCUMENTATION") {
      const missingDocs = clause.parameters.required_docs?.filter(doc =>
        !transaction.documents.some(d => d.includes(doc))
      );

      if (missingDocs && missingDocs.length > 0) {
        violations.push({
          rule_id: clause.id,
          type: "MISSING_DOCUMENT",
          description: `Missing required documents: ${missingDocs.join(", ")}`,
          severity: clause.severity
        });
        riskScore += 0.2;
      }
    }
  });

  // Cap risk score at 1.0
  riskScore = Math.min(riskScore, 1.0);

  return {
    transaction_id: transaction.id,
    is_compliant: violations.length === 0,
    violations,
    risk_score: riskScore,
    timestamp: new Date().toISOString()
  };
}
