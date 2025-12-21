import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create hash for content deduplication
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.log(`All ${maxRetries} retries failed`);
        return null;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

// Helper to verify authentication
async function verifyAuth(req: Request): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  
  if (authError || !user) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const { user, error: authError } = await verifyAuth(req);
  if (authError) {
    return authError;
  }
  console.log('Authenticated user:', user.id);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for options
    let targetPortalId: string | null = null;
    let useStreaming = false;
    try {
      const body = await req.json();
      targetPortalId = body?.portalId || null;
      useStreaming = body?.stream === true;
    } catch {
      // No body or invalid JSON
    }

    // For streaming responses
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            // Fetch portals
            let query = supabase.from('regulation_portals').select('*').eq('is_active', true);
            if (targetPortalId) {
              query = query.eq('id', targetPortalId);
            }
            const { data: portals, error: portalsError } = await query;

            if (portalsError) throw portalsError;

            send('start', { portals: portals?.length || 0 });

            for (const portal of portals || []) {
              send('portal_start', { portal: portal.name, id: portal.id });

              try {
                // Map URLs
                const mapResult = await withRetry(async () => {
                  const response = await fetch('https://api.firecrawl.dev/v1/map', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${firecrawlApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: portal.base_url,
                      limit: 50,
                      includeSubdomains: false,
                    }),
                  });
                  const data = await response.json();
                  if (!response.ok || !data.success) throw new Error(data.error);
                  return data;
                });

                if (!mapResult) {
                  send('portal_error', { portal: portal.name, error: 'Failed to map URLs' });
                  continue;
                }

                const urls = mapResult.links || [];
                const regulationPatterns = [
                  /circular/i, /notification/i, /order/i, /amendment/i,
                  /act/i, /rule/i, /guideline/i, /press/i, /gazette/i,
                  /faq/i, /instruction/i, /directive/i
                ];

                const relevantUrls = urls.filter((url: string) => {
                  if (url.toLowerCase().endsWith('.pdf')) return false;
                  if (url.includes('/hindi/')) return false;
                  return regulationPatterns.some(pattern => pattern.test(url));
                }).slice(0, 5);

                send('urls_found', { portal: portal.name, total: urls.length, relevant: relevantUrls.length });

                let indexed = 0;
                let skipped = 0;
                let failed = 0;

                for (const url of relevantUrls) {
                  send('scraping', { url, portal: portal.name });

                  const scrapeResult = await withRetry(async () => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 20000);

                    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${firecrawlApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        url,
                        formats: ['markdown'],
                        onlyMainContent: true,
                        waitFor: 5000,
                      }),
                      signal: controller.signal,
                    });
                    clearTimeout(timeoutId);

                    const data = await response.json();
                    if (!response.ok || !data.success) throw new Error(data.error || 'Scrape failed');
                    return data;
                  }, 2);

                  if (!scrapeResult) {
                    failed++;
                    send('scrape_failed', { url, retries: 2 });
                    continue;
                  }

                  const content = scrapeResult.data?.markdown || '';
                  const contentHash = await hashContent(content);

                  // Check existing
                  const { data: existing } = await supabase
                    .from('indexed_regulations')
                    .select('id, content_hash')
                    .eq('url', url)
                    .single();

                  if (existing && existing.content_hash === contentHash) {
                    skipped++;
                    send('skipped', { url, reason: 'unchanged' });
                    continue;
                  }

                  const title = scrapeResult.data?.metadata?.title ||
                    content.split('\n').find((line: string) => line.startsWith('#'))?.replace(/^#+\s*/, '') ||
                    url.split('/').pop()?.replace(/[-_]/g, ' ') || 'Untitled';

                  // AI summary
                  let summary = '';
                  if (lovableApiKey && content.length > 100) {
                    try {
                      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${lovableApiKey}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          model: 'google/gemini-2.5-flash',
                          messages: [
                            { role: 'system', content: 'Provide a brief 2-3 sentence summary focusing on key compliance requirements.' },
                            { role: 'user', content: `Summarize: ${content.slice(0, 4000)}` },
                          ],
                        }),
                      });
                      if (aiResponse.ok) {
                        const aiData = await aiResponse.json();
                        summary = aiData.choices?.[0]?.message?.content || '';
                      }
                    } catch { /* ignore */ }
                  }

                  // Upsert
                  const { error: upsertError } = await supabase
                    .from('indexed_regulations')
                    .upsert({
                      url,
                      source: portal.name,
                      title,
                      content: content.slice(0, 50000),
                      summary,
                      category: portal.category,
                      content_hash: contentHash,
                      crawled_at: new Date().toISOString(),
                      is_processed: !!summary,
                    }, { onConflict: 'url' });

                  if (upsertError) {
                    failed++;
                    send('upsert_error', { url, error: upsertError.message });
                  } else {
                    indexed++;
                    send('indexed', { url, title });
                  }

                  await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Update portal timestamp
                await supabase
                  .from('regulation_portals')
                  .update({ last_crawled_at: new Date().toISOString() })
                  .eq('id', portal.id);

                send('portal_complete', { portal: portal.name, indexed, skipped, failed });

              } catch (err) {
                send('portal_error', { portal: portal.name, error: err instanceof Error ? err.message : 'Unknown' });
              }
            }

            send('complete', { success: true });
          } catch (error) {
            send('error', { error: error instanceof Error ? error.message : 'Unknown' });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Non-streaming mode (for cron jobs)
    let query = supabase.from('regulation_portals').select('*').eq('is_active', true);
    if (targetPortalId) {
      query = query.eq('id', targetPortalId);
    }
    const { data: portals, error: portalsError } = await query;

    if (portalsError) throw portalsError;

    console.log(`Found ${portals?.length || 0} active portals to crawl`);

    const results: { portal: string; urls: number; indexed: number; skipped: number; failed: number }[] = [];

    for (const portal of portals || []) {
      console.log(`Crawling: ${portal.name}`);
      const result = { portal: portal.name, urls: 0, indexed: 0, skipped: 0, failed: 0 };

      try {
        const mapResult = await withRetry(async () => {
          const response = await fetch('https://api.firecrawl.dev/v1/map', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: portal.base_url, limit: 50, includeSubdomains: false }),
          });
          const data = await response.json();
          if (!response.ok || !data.success) throw new Error(data.error);
          return data;
        });

        if (!mapResult) {
          results.push(result);
          continue;
        }

        const urls = mapResult.links || [];
        result.urls = urls.length;

        const regulationPatterns = [
          /circular/i, /notification/i, /order/i, /amendment/i,
          /act/i, /rule/i, /guideline/i, /faq/i
        ];

        const relevantUrls = urls.filter((url: string) => {
          if (url.toLowerCase().endsWith('.pdf')) return false;
          if (url.includes('/hindi/')) return false;
          return regulationPatterns.some(p => p.test(url));
        }).slice(0, 5);

        for (const url of relevantUrls) {
          const scrapeResult = await withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${firecrawlApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 5000 }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error);
            return data;
          }, 2);

          if (!scrapeResult) {
            result.failed++;
            continue;
          }

          const content = scrapeResult.data?.markdown || '';
          const contentHash = await hashContent(content);

          const { data: existing } = await supabase
            .from('indexed_regulations')
            .select('id, content_hash')
            .eq('url', url)
            .single();

          if (existing && existing.content_hash === contentHash) {
            result.skipped++;
            continue;
          }

          const title = scrapeResult.data?.metadata?.title ||
            content.split('\n').find((line: string) => line.startsWith('#'))?.replace(/^#+\s*/, '') ||
            'Untitled';

          let summary = '';
          if (lovableApiKey && content.length > 100) {
            try {
              const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${lovableApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  messages: [
                    { role: 'system', content: 'Provide a brief 2-3 sentence summary.' },
                    { role: 'user', content: `Summarize: ${content.slice(0, 4000)}` },
                  ],
                }),
              });
              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                summary = aiData.choices?.[0]?.message?.content || '';
              }
            } catch { /* ignore */ }
          }

          const { error: upsertError } = await supabase
            .from('indexed_regulations')
            .upsert({
              url,
              source: portal.name,
              title,
              content: content.slice(0, 50000),
              summary,
              category: portal.category,
              content_hash: contentHash,
              crawled_at: new Date().toISOString(),
              is_processed: !!summary,
            }, { onConflict: 'url' });

          if (!upsertError) {
            result.indexed++;
            console.log(`Indexed: ${title}`);
          } else {
            result.failed++;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await supabase
          .from('regulation_portals')
          .update({ last_crawled_at: new Date().toISOString() })
          .eq('id', portal.id);

      } catch (err) {
        console.error(`Error crawling ${portal.name}:`, err);
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Crawler error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
