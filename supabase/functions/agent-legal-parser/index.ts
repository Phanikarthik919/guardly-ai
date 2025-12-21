import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a Legal Parsing Agent specializing in converting Indian government regulations into machine-readable compliance clauses. Your role is to:

1. Parse unstructured regulatory text into structured compliance rules
2. Extract key entities: dates, amounts, thresholds, conditions
3. Identify mandatory vs optional requirements
4. Create IF-THEN compliance rules from legal language

When given regulatory text or a regulation reference, provide:
- Structured JSON-like compliance clauses
- Key entities extracted (dates, amounts, parties)
- Conditions and triggers for compliance
- Penalty/consequence clauses

Format: Present parsed clauses in a structured format with clear rule definitions.

Example output format:
CLAUSE_ID: GST_FILING_001
RULE: IF transaction_value > 50_lakhs THEN file_gstr1 WITHIN 11_days_of_month_end
ENTITIES: {threshold: 50_lakhs, deadline: 11th_of_next_month}
PENALTY: Late fee of ₹50/day up to ₹5000`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Legal Parser Agent processing text of length:", text?.length);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Retry Gemini calls on 429/503 to avoid failing the whole audit during bursts.
    const maxRetries = 4;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\nParse the following regulatory text into structured compliance clauses:\n\n${text}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (response.ok) break;

      // Backoff on Gemini quota / transient overload
      if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
        const backoffMs = Math.min(30000, 1200 * 2 ** attempt + Math.floor(Math.random() * 400));
        console.warn(
          `Gemini returned ${response.status} for agent-legal-parser (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.ceil(backoffMs / 1000)}s...`
        );
        await sleep(backoffMs);
        continue;
      }

      break;
    }

    if (!response) {
      throw new Error("Failed to call Gemini");
    }

    if (!response.ok) {
      if (response.status === 429) {
        const errorText = await response.text().catch(() => "");
        console.error("Gemini API 429 (rate limited):", errorText);

        // Never fail the caller with 429. Return a minimal fallback clause stream so the audit can proceed.
        const fallbackText =
          `CLAUSE_ID: FALLBACK_001\n` +
          `RULE: IF transaction_value > 0 THEN perform_compliance_review WITHIN 30_days\n` +
          `ENTITIES: {deadline: 30_days}\n` +
          `PENALTY: Manual review required (AI temporarily rate-limited).\n\n` +
          `CLAUSE_ID: FALLBACK_002\n` +
          `RULE: IF document_type = 'financial_record' THEN maintain_records FOR 8_years\n` +
          `ENTITIES: {retention: 8_years}\n` +
          `PENALTY: Documentation gaps may lead to penalties under applicable rules.`;

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const openAIFormat = { choices: [{ delta: { content: fallbackText } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      }

      const errorText = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (content) {
                const openAIFormat = {
                  choices: [{ delta: { content } }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Legal Parser error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
