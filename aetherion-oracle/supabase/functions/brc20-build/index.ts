import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { getBrc20Token, backendName } from '../_shared/ord-client.ts';

const BodySchema = z.object({
  op: z.enum(['deploy', 'mint', 'transfer']),
  tick: z.string().length(4),
  max: z.string().optional(),
  lim: z.string().optional(),
  dec: z.string().optional(),
  amt: z.string().optional(),
  to: z.string().optional(),
  btc_address: z.string().min(26).max(90),
  fee_rate: z.number().int().min(1).max(2000).optional(),
  network: z.enum(['mainnet']).default('mainnet'),
});

async function isTickTaken(tick: string): Promise<boolean> {
  const info = await getBrc20Token(tick);
  return info.exists;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const body = parsed.data;
    const tick = body.tick.toUpperCase();

    // Build canonical JSON
    let inscription: Record<string, string>;
    if (body.op === 'deploy') {
      if (!body.max || !body.lim) {
        return new Response(JSON.stringify({ error: 'max and lim required for deploy' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const taken = await isTickTaken(tick);
      if (taken) {
        const suggestions = [`${tick.slice(0, 3)}X`, `${tick.slice(0, 2)}TX`, 'AETH'].filter(s => s !== tick);
        return new Response(JSON.stringify({ error: 'tick_taken', tick, suggestions }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      inscription = { p: 'brc-20', op: 'deploy', tick, max: body.max, lim: body.lim };
      if (body.dec) inscription.dec = body.dec;
    } else if (body.op === 'mint') {
      if (!body.amt) return new Response(JSON.stringify({ error: 'amt required for mint' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      inscription = { p: 'brc-20', op: 'mint', tick, amt: body.amt };
    } else {
      if (!body.amt || !body.to) return new Response(JSON.stringify({ error: 'amt and to required for transfer' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      inscription = { p: 'brc-20', op: 'transfer', tick, amt: body.amt };
    }

    const json = JSON.stringify(inscription);
    const bytes = new TextEncoder().encode(json).length;

    // Persist draft row for deploys; mints/transfers handled by client + brc20-confirm
    let tokenId: string | null = null;
    if (body.op === 'deploy') {
      // RLS "Deployer inserts own tokens" enforces auth.uid() = deployer_user_id.
      const { data, error } = await supabase.from('brc20_tokens').insert({
        tick,
        max: body.max,
        lim: body.lim,
        dec: Number(body.dec ?? 18),
        network: body.network,
        deployer_user_id: user.id,
        deployer_btc_address: body.btc_address,
        status: 'draft',
        fee_rate: body.fee_rate ?? null,
        raw_inscription_json: json,
      }).select('id').single();
      if (error) {
        console.error('brc20-build insert:', error);
        return new Response(JSON.stringify({ error: 'Failed to create token draft.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      tokenId = data.id;
    }

    return new Response(JSON.stringify({ ok: true, tokenId, inscription, json, bytes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('brc20-build error:', e);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
