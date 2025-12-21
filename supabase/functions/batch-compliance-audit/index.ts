import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  id: string;
  date: string;
  vendor: string;
  description: string;
  amount: number;
  tax: number;
  category: string;
}

interface Regulation {
  id: string;
  title: string;
  source: string;
  content: string;
}

interface BatchRequest {
  transactions: Transaction[];
  regulations: Regulation[];
}

interface ParsedClause {
  clauseId: string;
  regulationId: string;
  rule: string;
  conditions: string;
  penalties: string;
}

interface ComplianceResult {
  transactionId: string;
  clauseId: string;
  status: 'compliant' | 'violation' | 'warning';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

interface BatchResponse {
  clauses: ParsedClause[];
  results: ComplianceResult[];
  summary: string;
}

const BATCH_PROMPT = `You are a Compliance Audit Agent. Analyze transactions against regulations and return a JSON response.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations outside JSON.

For each regulation, extract 1-2 compliance clauses.
For each transaction, check against ALL clauses and determine compliance status.

Response format:
{
  "clauses": [
    {
      "clauseId": "REG1_001",
      "regulationId": "uuid-of-regulation",
      "rule": "IF condition THEN requirement",
      "conditions": "When this applies",
      "penalties": "Consequence of violation"
    }
  ],
  "results": [
    {
      "transactionId": "uuid-of-transaction",
      "clauseId": "REG1_001",
      "status": "compliant|violation|warning",
      "riskLevel": "low|medium|high",
      "reasoning": "Brief explanation"
    }
  ],
  "summary": "Overall audit summary in 2-3 sentences"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, regulations }: BatchRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Batch Compliance Audit: ${transactions.length} transactions, ${regulations.length} regulations`);

    // Build the audit prompt
    const regulationsSummary = regulations.map((r, i) => 
      `[Regulation ${i + 1}] ID: ${r.id}\nTitle: ${r.title}\nSource: ${r.source}\nContent: ${r.content.slice(0, 1500)}`
    ).join('\n\n---\n\n');

    const transactionsSummary = transactions.map((t, i) =>
      `[Transaction ${i + 1}] ID: ${t.id}\nDate: ${t.date}\nVendor: ${t.vendor}\nAmount: ${t.amount}\nTax: ${t.tax}\nCategory: ${t.category}\nDescription: ${t.description}`
    ).join('\n\n');

    const userPrompt = `REGULATIONS:\n${regulationsSummary}\n\n---\n\nTRANSACTIONS:\n${transactionsSummary}\n\nAnalyze and return the JSON response.`;

    // Single API call using Lovable AI gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BATCH_PROMPT },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 8000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI response length:", content.length);

    // Parse the JSON response
    let parsed: BatchResponse;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", content.slice(0, 500));
      // Return a minimal valid response
      parsed = {
        clauses: regulations.map((r, i) => ({
          clauseId: `${r.source.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10)}_${String(i + 1).padStart(3, '0')}`,
          regulationId: r.id,
          rule: `Compliance required under ${r.source}`,
          conditions: `As per ${r.title}`,
          penalties: `Penalties as defined in ${r.source}`,
        })),
        results: transactions.map((t, i) => ({
          transactionId: t.id,
          clauseId: parsed?.clauses?.[0]?.clauseId || `CLAUSE_${i}`,
          status: 'warning' as const,
          riskLevel: 'medium' as const,
          reasoning: 'Manual review recommended due to AI parsing limitations.',
        })),
        summary: 'Audit completed with limited AI analysis. Manual review recommended.',
      };
    }

    // Ensure all transactions have at least one result
    const existingTxIds = new Set(parsed.results.map(r => r.transactionId));
    for (const tx of transactions) {
      if (!existingTxIds.has(tx.id) && parsed.clauses.length > 0) {
        parsed.results.push({
          transactionId: tx.id,
          clauseId: parsed.clauses[0].clauseId,
          status: 'warning',
          riskLevel: 'low',
          reasoning: 'No specific compliance issues identified.',
        });
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch Compliance Audit error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});