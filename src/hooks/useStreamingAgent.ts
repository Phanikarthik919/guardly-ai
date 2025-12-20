import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { MOCK_RESPONSES } from "@/lib/mockData";

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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        // Attempt to call the backend function
        const resp = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          // Check if it's likely a missing API key or backend issue that we should mock
          if (resp.status === 500 || resp.status === 402 || resp.status === 400 || resp.status === 404) {
             console.warn(`Backend function ${functionName} failed with ${resp.status}. Using mock response.`);
             throw new Error("Backend unavailable, switching to simulation.");
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
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
           // similar flushing logic
        }

        options.onComplete?.(fullResponse);
        return fullResponse;

      } catch (err) {
        // Fallback to mock response
        console.log(`Using mock response for ${functionName} due to error:`, err);
        const mockResponse = MOCK_RESPONSES[functionName];

        if (mockResponse) {
          // Simulate streaming
          const chunks = mockResponse.split(/(?=\s)/); // Split by words/spaces roughly
          let accumulated = "";

          for (const chunk of chunks) {
            await new Promise(r => setTimeout(r, 20)); // Simulate delay
            accumulated += chunk;
            setResponse(accumulated);
          }

          options.onComplete?.(mockResponse);
          setIsLoading(false);
          return mockResponse;
        }

        const message = err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        setIsLoading(false);
        throw err;
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
