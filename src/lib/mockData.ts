export const MOCK_RESPONSES: Record<string, string> = {
  'agent-regulation-monitor': `Based on the analysis of the provided URL/content, here is the regulation summary:

**Title:** Central Goods and Services Tax (Amendment) Act, 2024
**Category:** GST
**Source:** cbic.gov.in

**Summary:**
This amendment introduces new compliance requirements for input tax credit claims and modifies the time limit for issuing show cause notices.

**Key Requirements:**
1. Input Tax Credit (ITC) can only be claimed if the supplier has furnished details in GSTR-1.
2. Penalties for non-compliance with e-invoicing provisions have been revised.
3. New timeline for filing annual returns is December 31st.

**Deadlines:**
- Implementation Date: April 1, 2024
- Annual Return: December 31, 2024`,

  'agent-legal-parser': `Here are the parsed compliance clauses:

CLAUSE_ID: GST_ITC_RULE_36_4
RULE: IF itc_claimed > 1.05 * eligible_itc THEN flag_violation
ENTITIES: {threshold: "5%", base: "eligible_itc_in_gstr2b"}
CONDITIONS: Applies to all registered taxpayers filing GSTR-3B.
PENALTY: Reversal of excess credit with 18% interest.

CLAUSE_ID: INC_TAX_TDS_194Q
RULE: IF purchase_value > 50_lakhs AND turnover > 10_crores THEN deduct_tds AT_RATE 0.1%
ENTITIES: {threshold: 5000000, rate: 0.001}
CONDITIONS: Buyer turnover > 10Cr in preceding FY.
PENALTY: Disallowance of 30% of expenditure u/s 40(a)(ia).`,

  'agent-transaction-understanding': `[
  {
    "category": "Procurement",
    "amount": "₹1,45,000",
    "tax": "₹26,100",
    "vendor": "TechSolutions Pvt Ltd",
    "date": "2024-03-15",
    "description": "Purchase of 5 laptops for engineering team"
  },
  {
    "category": "Services",
    "amount": "₹50,000",
    "tax": "₹9,000",
    "vendor": "CloudServ Consulting",
    "date": "2024-03-18",
    "description": "Cloud migration consultation fees"
  }
]`,

  'agent-compliance-mapping': `Based on the transaction and clause analysis:

**Status:** Compliant
**Risk Level:** Low

**Reasoning:**
The transaction of ₹1,45,000 with TechSolutions Pvt Ltd for laptop procurement falls within the prescribed limits. GST of 18% (₹26,100) has been correctly calculated and charged. The vendor is a registered GST entity.

**Compliance Checks:**
1. ✓ Vendor GSTIN is valid.
2. ✓ Tax rate (18%) matches HSN code for Electronics.
3. ✓ Invoice value is below the threshold for e-way bill generation for intra-state movement (if applicable).`,

  'agent-auditor-assistant': `{
  "summary": {
    "totalChecked": 5,
    "compliant": 4,
    "violations": 1,
    "warnings": 0
  },
  "details": [
    {
      "complianceResultId": "mock-id-1",
      "clauseReference": "GST_ITC_RULE_36_4",
      "reasoning": "Input Tax Credit claimed matches GSTR-2B data.",
      "correctiveAction": "None. Continue monitoring."
    },
    {
      "complianceResultId": "mock-id-2",
      "clauseReference": "INC_TAX_TDS_194Q",
      "reasoning": "TDS not deducted on purchase exceeding ₹50 Lakhs.",
      "correctiveAction": "Immediate deduction and deposit of TDS with interest."
    }
  ]
}`
};
