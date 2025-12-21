import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getSupabasePublicConfig } from "@/lib/publicConfig";

interface UseStreamingAgentOptions {
  onComplete?: (fullResponse: string) => void;
}

export function useStreamingAgent(options: UseStreamingAgentOptions = {}) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearResponse = useCallback(() => {
    setResponse("");
    setError(null);
  }, []);

  const runAgent = useCallback(
    async (functionName: string, body: Record<string, unknown>) => {
      setIsLoading(true);
      setResponse("");
      setError(null);

      try {
        const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabasePublicConfig();
        const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (resp.status === 402) {
            throw new Error("Payment required. Please add credits to continue.");
          }
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${resp.status}`);
        }

        if (!resp.body) {
          throw new Error("No response body");
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullResponse += content;
                setResponse(fullResponse);
              }
            } catch {
              // Incomplete JSON, put back and wait for more
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                fullResponse += content;
                setResponse(fullResponse);
              }
            } catch {
              /* ignore */
            }
          }
        }

        options.onComplete?.(fullResponse);
        return fullResponse;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, options]
  );

  return {
    response,
    isLoading,
    error,
    runAgent,
    clearResponse,
  };
}
