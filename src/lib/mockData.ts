import { Regulation, ComplianceClause, Transaction } from "@/contexts/PipelineContext";

export const MOCK_REGULATIONS: Regulation[] = [
  {
    id: "2024_GST_CIRCULAR_045",
    name: "CGST on infrastructure supplies",
    description: "Regulations regarding Central Goods and Services Tax on infrastructure projects.",
    effective_date: "2024-12-01",
    raw_content: "Applicable tax rate is 18% for construction projects exceeding 10 Lakhs.",
    source_url: "https://gov.in/gst/2024/045"
  },
  {
    id: "PROCUREMENT_ACT_2023",
    name: "Public Procurement Guidelines",
    description: "Standard operating procedures for government tenders.",
    effective_date: "2023-04-01",
    raw_content: "Minimum of 3 competitive bids required for all procurements above threshold.",
    source_url: "https://gov.in/procurement/2023"
  }
];

export const MOCK_CLAUSES: ComplianceClause[] = [
  {
    id: "CLAUSE_GST_INFRA_18",
    regulation_id: "2024_GST_CIRCULAR_045",
    rule_name: "CGST Construction Standard",
    description: "18% GST applies to construction contracts > 10L",
    category: "TAX",
    parameters: {
      rate: 0.18,
      min_amount: 1000000,
      applicable_types: ["construction", "infrastructure"]
    },
    severity: "CRITICAL"
  },
  {
    id: "CLAUSE_BID_MIN_3",
    regulation_id: "PROCUREMENT_ACT_2023",
    rule_name: "Minimum Bid Requirement",
    description: "Must have at least 3 bids for contracts > 10L",
    category: "BIDDING",
    parameters: {
      min_bids: 3,
      min_amount: 1000000
    },
    severity: "HIGH"
  },
  {
    id: "CLAUSE_DOC_ORDER",
    regulation_id: "PROCUREMENT_ACT_2023",
    rule_name: "Project Order Documentation",
    description: "Project order document must be attached",
    category: "DOCUMENTATION",
    parameters: {
      required_docs: ["project_order"]
    },
    severity: "MEDIUM"
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN_2024_FINANCE_00145",
    amount: 2500000,
    vendor_name: "BuildRight Infra Ltd",
    category: "construction",
    date: "2024-12-15",
    tax_paid: 125000,
    bids_received: 2,
    documents: ["invoice.pdf", "grn.pdf"],
    status: "pending"
  },
  {
    id: "TXN_2024_FINANCE_00146",
    amount: 500000,
    vendor_name: "SoftServe Tech",
    category: "software",
    date: "2024-12-16",
    tax_paid: 90000,
    bids_received: 3,
    documents: ["invoice.pdf", "vendor_cert"],
    status: "pending"
  }
];
