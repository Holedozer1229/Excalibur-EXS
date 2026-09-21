import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const BodySchema = z.object({
  tokenId: z.string().uuid().optional(),
  operationId: z.string().uuid().optional(),
  revealTx: z.string().min(64).max(80),
  inscriptionId: z.string().optional(),
  wallet: z.enum(['unisat', 'xverse']),
  // For mint/transfer ops created client-side
  op: z.enum(['mint', 'transfer']).optional(),
  tick: z.string().length(4).optional(),
  amount: z.string().optional(),
  toAddress: z.string().optional(),
  rawInscriptionJson: z.string().optional(),
});

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
    const b = parsed.data;
    // Use user-scoped client throughout — RLS policies enforce ownership on
    // brc20_tokens, brc20_operations, and memories. Service role not needed.
    if (b.tokenId) {
      // Deploy confirmation
      const { data: token, error: tErr } = await supabase.from('brc20_tokens')
        .update({
          status: 'inscribed',
          reveal_tx: b.revealTx,
          inscription_id: b.inscriptionId ?? null,
          wallet_used: b.wallet,
        })
        .eq('id', b.tokenId)
        .eq('deployer_user_id', user.id)
        .select()
        .single();
      if (tErr) { console.error('brc20-confirm token update:', tErr); return new Response(JSON.stringify({ error: 'Failed to confirm token.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

      await supabase.from('memories').insert({
        user_id: user.id,
        source: 'brc20',
        content: `BRC-20 deploy: ${token.tick} (max=${token.max}, lim=${token.lim}) reveal=${b.revealTx}`,
        summary: `BRC-20 ${token.tick} deployed on ${token.network}`,
      });

      return new Response(JSON.stringify({ ok: true, token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mint or transfer
    if (!b.op || !b.tick || !b.amount || !b.rawInscriptionJson) {
      return new Response(JSON.stringify({ error: 'op/tick/amount/rawInscriptionJson required for mint/transfer' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Public can view inscribed tokens; deployers can view own — RLS handles both.
    const { data: tokenRow } = await supabase.from('brc20_tokens').select('id').eq('tick', b.tick.toUpperCase()).eq('network', 'mainnet').maybeSingle();
    const { data: op, error: oErr } = await supabase.from('brc20_operations').insert({
      token_id: tokenRow?.id ?? null,
      user_id: user.id,
      op: b.op,
      amount: b.amount,
      to_address: b.toAddress ?? null,
      reveal_tx: b.revealTx,
      inscription_id: b.inscriptionId ?? null,
      status: 'inscribed',
      raw_inscription_json: b.rawInscriptionJson,
      wallet_used: b.wallet,
    }).select().single();
    if (oErr) { console.error('brc20-confirm op insert:', oErr); return new Response(JSON.stringify({ error: 'Failed to record operation.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    return new Response(JSON.stringify({ ok: true, operation: op }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('brc20-confirm error:', e); return new Response(JSON.stringify({ error: 'An internal error occurred.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
