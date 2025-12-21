import { useState, useCallback } from 'react';
import { getSupabasePublicConfig } from "@/lib/publicConfig";

type AgentType = 'regulation-monitor' | 'legal-parser' | 'transaction-understanding' | 'compliance-mapping' | 'auditor-assistant';

interface UseAgentDemoReturn {
  response: string;
  isLoading: boolean;
  error: string | null;
  runAgent: (input: string) => Promise<void>;
  clearResponse: () => void;
}

const AGENT_ENDPOINTS: Record<AgentType, { endpoint: string; inputKey: string }> = {
  'regulation-monitor': { endpoint: 'agent-regulation-monitor', inputKey: 'query' },
  'legal-parser': { endpoint: 'agent-legal-parser', inputKey: 'text' },
  'transaction-understanding': { endpoint: 'agent-transaction-understanding', inputKey: 'transactionData' },
  'compliance-mapping': { endpoint: 'agent-compliance-mapping', inputKey: 'transaction' },
  'auditor-assistant': { endpoint: 'agent-auditor-assistant', inputKey: 'complianceData' },
};

export function useAgentDemo(agentType: AgentType): UseAgentDemoReturn {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearResponse = useCallback(() => {
    setResponse('');
    setError(null);
  }, []);

  const runAgent = useCallback(async (input: string) => {
    setIsLoading(true);
    setError(null);
    setResponse('');

    const { endpoint, inputKey } = AGENT_ENDPOINTS[agentType];
    const url = `${getSupabasePublicConfig().url}/functions/v1/${endpoint}`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSupabasePublicConfig().publishableKey}`,
        },
        body: JSON.stringify({ [inputKey]: input }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (resp.status === 402) {
          throw new Error('Payment required. Please add funds to your workspace.');
        }
        throw new Error('Failed to run agent');
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error('Agent error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [agentType]);

  return { response, isLoading, error, runAgent, clearResponse };
}
