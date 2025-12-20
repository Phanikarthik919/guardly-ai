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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Fetch active portals
    const { data: portals, error: portalsError } = await supabase
      .from('regulation_portals')
      .select('*')
      .eq('is_active', true);

    if (portalsError) {
      console.error('Error fetching portals:', portalsError);
      throw portalsError;
    }

    console.log(`Found ${portals?.length || 0} active portals to crawl`);

    const results: { portal: string; urls: number; newRegulations: number; errors: string[] }[] = [];

    for (const portal of portals || []) {
      console.log(`Crawling portal: ${portal.name} (${portal.base_url})`);
      const portalResult = { portal: portal.name, urls: 0, newRegulations: 0, errors: [] as string[] };

      try {
        // Use Firecrawl map to discover URLs
        const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: portal.base_url,
            limit: 50, // Limit URLs per portal to avoid rate limits
            includeSubdomains: false,
          }),
        });

        const mapData = await mapResponse.json();

        if (!mapResponse.ok || !mapData.success) {
          portalResult.errors.push(`Map failed: ${mapData.error || 'Unknown error'}`);
          results.push(portalResult);
          continue;
        }

        const urls = mapData.links || [];
        portalResult.urls = urls.length;
        console.log(`Found ${urls.length} URLs for ${portal.name}`);

        // Filter URLs that might contain regulations/circulars
        const regulationPatterns = [
          /circular/i, /notification/i, /order/i, /amendment/i,
          /act/i, /rule/i, /guideline/i, /press/i, /gazette/i,
          /faq/i, /instruction/i, /directive/i
        ];

        const relevantUrls = urls.filter((url: string) => 
          regulationPatterns.some(pattern => pattern.test(url))
        ).slice(0, 10); // Limit to 10 per portal per run

        console.log(`Filtered to ${relevantUrls.length} relevant URLs for ${portal.name}`);

        // Scrape and process each relevant URL
        for (const url of relevantUrls) {
          try {
            // Check if URL already exists
            const { data: existing } = await supabase
              .from('indexed_regulations')
              .select('id, content_hash')
              .eq('url', url)
              .single();

            // Scrape the page
            const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${firecrawlApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url,
                formats: ['markdown'],
                onlyMainContent: true,
              }),
            });

            const scrapeData = await scrapeResponse.json();

            if (!scrapeResponse.ok || !scrapeData.success) {
              console.log(`Failed to scrape ${url}: ${scrapeData.error || 'Unknown error'}`);
              continue;
            }

            const content = scrapeData.data?.markdown || '';
            const contentHash = await hashContent(content);

            // Skip if content hasn't changed
            if (existing && existing.content_hash === contentHash) {
              console.log(`Skipping ${url} - content unchanged`);
              continue;
            }

            // Extract title from metadata or content
            const title = scrapeData.data?.metadata?.title || 
              content.split('\n').find((line: string) => line.startsWith('#'))?.replace(/^#+\s*/, '') ||
              url.split('/').pop()?.replace(/[-_]/g, ' ') || 'Untitled';

            // Use AI to generate summary if available
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
                      {
                        role: 'system',
                        content: 'You are a regulatory analyst. Provide a brief 2-3 sentence summary of the regulation content. Focus on key requirements and deadlines.',
                      },
                      {
                        role: 'user',
                        content: `Summarize this regulation:\n\n${content.slice(0, 4000)}`,
                      },
                    ],
                  }),
                });

                if (aiResponse.ok) {
                  const aiData = await aiResponse.json();
                  summary = aiData.choices?.[0]?.message?.content || '';
                }
              } catch (aiError) {
                console.log(`AI summary failed for ${url}:`, aiError);
              }
            }

            // Upsert regulation
            const { error: upsertError } = await supabase
              .from('indexed_regulations')
              .upsert({
                url,
                source: portal.name,
                title,
                content: content.slice(0, 50000), // Limit content size
                summary,
                category: portal.category,
                content_hash: contentHash,
                crawled_at: new Date().toISOString(),
                is_processed: !!summary,
              }, {
                onConflict: 'url',
              });

            if (upsertError) {
              console.error(`Error upserting ${url}:`, upsertError);
              portalResult.errors.push(`Upsert failed for ${url}`);
            } else {
              portalResult.newRegulations++;
              console.log(`Indexed: ${title}`);
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (urlError) {
            console.error(`Error processing ${url}:`, urlError);
            portalResult.errors.push(`Error processing ${url}`);
          }
        }

        // Update last crawled timestamp
        await supabase
          .from('regulation_portals')
          .update({ last_crawled_at: new Date().toISOString() })
          .eq('id', portal.id);

      } catch (portalError) {
        console.error(`Error crawling ${portal.name}:`, portalError);
        portalResult.errors.push(`Portal error: ${portalError instanceof Error ? portalError.message : 'Unknown'}`);
      }

      results.push(portalResult);
    }

    console.log('Crawl complete:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Regulation crawler error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
