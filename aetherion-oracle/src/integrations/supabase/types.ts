export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      aetx_claims: {
        Row: {
          amount: number
          btc_address: string
          created_at: string
          id: string
          inscription_id: string | null
          note: string | null
          processed_at: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          btc_address: string
          created_at?: string
          id?: string
          inscription_id?: string | null
          note?: string | null
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          btc_address?: string
          created_at?: string
          id?: string
          inscription_id?: string | null
          note?: string | null
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aetx_ledger: {
        Row: {
          claim_id: string | null
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          receipt_id: string | null
          user_id: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          receipt_id?: string | null
          user_id: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          receipt_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      brc20_operations: {
        Row: {
          amount: number
          created_at: string
          id: string
          inscription_id: string | null
          op: string
          raw_inscription_json: string
          reveal_tx: string | null
          status: string
          to_address: string | null
          token_id: string
          updated_at: string
          user_id: string
          wallet_used: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          inscription_id?: string | null
          op: string
          raw_inscription_json: string
          reveal_tx?: string | null
          status?: string
          to_address?: string | null
          token_id: string
          updated_at?: string
          user_id: string
          wallet_used?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          inscription_id?: string | null
          op?: string
          raw_inscription_json?: string
          reveal_tx?: string | null
          status?: string
          to_address?: string | null
          token_id?: string
          updated_at?: string
          user_id?: string
          wallet_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brc20_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "brc20_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      brc20_tokens: {
        Row: {
          created_at: string
          dec: number
          deployer_btc_address: string
          deployer_user_id: string
          fee_rate: number | null
          id: string
          inscription_id: string | null
          lim: number
          max: number
          network: string
          raw_inscription_json: string
          reveal_tx: string | null
          status: string
          tick: string
          updated_at: string
          wallet_used: string | null
        }
        Insert: {
          created_at?: string
          dec?: number
          deployer_btc_address: string
          deployer_user_id: string
          fee_rate?: number | null
          id?: string
          inscription_id?: string | null
          lim: number
          max: number
          network?: string
          raw_inscription_json: string
          reveal_tx?: string | null
          status?: string
          tick: string
          updated_at?: string
          wallet_used?: string | null
        }
        Update: {
          created_at?: string
          dec?: number
          deployer_btc_address?: string
          deployer_user_id?: string
          fee_rate?: number | null
          id?: string
          inscription_id?: string | null
          lim?: number
          max?: number
          network?: string
          raw_inscription_json?: string
          reveal_tx?: string | null
          status?: string
          tick?: string
          updated_at?: string
          wallet_used?: string | null
        }
        Relationships: []
      }
      caduceus_corpus: {
        Row: {
          aetherion_phase: string | null
          created_at: string
          embedding: string | null
          engine_state: Json
          harmony: number | null
          hexagram_number: number | null
          id: string
          resolution: string
          seed: number | null
          tags: string[]
          word: string
        }
        Insert: {
          aetherion_phase?: string | null
          created_at?: string
          embedding?: string | null
          engine_state: Json
          harmony?: number | null
          hexagram_number?: number | null
          id?: string
          resolution: string
          seed?: number | null
          tags?: string[]
          word: string
        }
        Update: {
          aetherion_phase?: string | null
          created_at?: string
          embedding?: string | null
          engine_state?: Json
          harmony?: number | null
          hexagram_number?: number | null
          id?: string
          resolution?: string
          seed?: number | null
          tags?: string[]
          word?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      codex_state: {
        Row: {
          dominant_symbol: string | null
          global_entropy: number | null
          identity_stability: number | null
          run_count: number
          state_seed: number
          top_symbols: Json
          updated_at: string
          user_id: string
          word: string
        }
        Insert: {
          dominant_symbol?: string | null
          global_entropy?: number | null
          identity_stability?: number | null
          run_count?: number
          state_seed?: number
          top_symbols?: Json
          updated_at?: string
          user_id: string
          word: string
        }
        Update: {
          dominant_symbol?: string | null
          global_entropy?: number | null
          identity_stability?: number | null
          run_count?: number
          state_seed?: number
          top_symbols?: Json
          updated_at?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      credits_ledger: {
        Row: {
          command: string | null
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          command?: string | null
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          command?: string | null
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cross_chain_nodes: {
        Row: {
          accent: string
          active: boolean
          chain: string
          created_at: string
          edge_label: string | null
          edge_to: string | null
          href: string
          id: string
          note: string
          sort_order: number
          standard: string
          tick: string
          updated_at: string
          venue: string
        }
        Insert: {
          accent?: string
          active?: boolean
          chain: string
          created_at?: string
          edge_label?: string | null
          edge_to?: string | null
          href?: string
          id?: string
          note: string
          sort_order?: number
          standard: string
          tick: string
          updated_at?: string
          venue: string
        }
        Update: {
          accent?: string
          active?: boolean
          chain?: string
          created_at?: string
          edge_label?: string | null
          edge_to?: string | null
          href?: string
          id?: string
          note?: string
          sort_order?: number
          standard?: string
          tick?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      divination_receipts: {
        Row: {
          cards: Json | null
          commitment_hash: string
          expires_at: string
          id: string
          issued_at: string
          nonce: string
          quantum: Json | null
          question_excerpt: string | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          wallet_address: string | null
        }
        Insert: {
          cards?: Json | null
          commitment_hash: string
          expires_at?: string
          id?: string
          issued_at?: string
          nonce: string
          quantum?: Json | null
          question_excerpt?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          wallet_address?: string | null
        }
        Update: {
          cards?: Json | null
          commitment_hash?: string
          expires_at?: string
          id?: string
          issued_at?: string
          nonce?: string
          quantum?: Json | null
          question_excerpt?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      dream_shares: {
        Row: {
          created_at: string
          dream_id: string
          expires_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dream_id: string
          expires_at?: string | null
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          dream_id?: string
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_shares_dream_id_fkey"
            columns: ["dream_id"]
            isOneToOne: false
            referencedRelation: "dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      dreams: {
        Row: {
          body: string
          created_at: string
          harmony: number | null
          id: string
          interpretation: string | null
          kind: string
          model: string | null
          source_text: string | null
          sponge_harmonic: number | null
          symbols: string[] | null
          title: string | null
          user_id: string
          vitality: string | null
        }
        Insert: {
          body: string
          created_at?: string
          harmony?: number | null
          id?: string
          interpretation?: string | null
          kind: string
          model?: string | null
          source_text?: string | null
          sponge_harmonic?: number | null
          symbols?: string[] | null
          title?: string | null
          user_id: string
          vitality?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          harmony?: number | null
          id?: string
          interpretation?: string | null
          kind?: string
          model?: string | null
          source_text?: string | null
          sponge_harmonic?: number | null
          symbols?: string[] | null
          title?: string | null
          user_id?: string
          vitality?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json
          path: string | null
          ref_code: string | null
          referrer: string | null
          session_id: string
          source: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          path?: string | null
          ref_code?: string | null
          referrer?: string | null
          session_id: string
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          path?: string | null
          ref_code?: string | null
          referrer?: string | null
          session_id?: string
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      hexagram_docs: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          hexagram_number: number | null
          id: string
          kind: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          hexagram_number?: number | null
          id?: string
          kind?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          hexagram_number?: number | null
          id?: string
          kind?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learn_articles: {
        Row: {
          body_markdown: string
          created_at: string
          keyword: string | null
          model: string | null
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          keyword?: string | null
          model?: string | null
          slug: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          keyword?: string | null
          model?: string | null
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_generations: {
        Row: {
          created_at: string
          dream_id: string | null
          error: string | null
          id: string
          kind: string
          output_url: string | null
          prediction_id: string | null
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dream_id?: string | null
          error?: string | null
          id?: string
          kind: string
          output_url?: string | null
          prediction_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dream_id?: string | null
          error?: string | null
          id?: string
          kind?: string
          output_url?: string | null
          prediction_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          source: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          source?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          source?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_anchors: {
        Row: {
          anchored_at: string | null
          attestation_count: number
          attestation_ids: string[]
          chain_id: number | null
          contract_address: string | null
          created_at: string
          created_by: string | null
          id: string
          merkle_root: string
          onchain_tx_hash: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          anchored_at?: string | null
          attestation_count?: number
          attestation_ids?: string[]
          chain_id?: number | null
          contract_address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          merkle_root: string
          onchain_tx_hash?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          anchored_at?: string | null
          attestation_count?: number
          attestation_ids?: string[]
          chain_id?: number | null
          contract_address?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          merkle_root?: string
          onchain_tx_hash?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      mining_attestations: {
        Row: {
          attestation_hash: string
          created_at: string
          harmony: number | null
          id: string
          onchain_tx_hash: string | null
          query_excerpt: string | null
          response_excerpt: string | null
          round_number: number
          sponge_harmonic: number | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verifier_note: string | null
          vitality: string | null
          wallet_address: string | null
          word: string
          zk_proof_ref: string | null
        }
        Insert: {
          attestation_hash: string
          created_at?: string
          harmony?: number | null
          id?: string
          onchain_tx_hash?: string | null
          query_excerpt?: string | null
          response_excerpt?: string | null
          round_number: number
          sponge_harmonic?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verifier_note?: string | null
          vitality?: string | null
          wallet_address?: string | null
          word: string
          zk_proof_ref?: string | null
        }
        Update: {
          attestation_hash?: string
          created_at?: string
          harmony?: number | null
          id?: string
          onchain_tx_hash?: string | null
          query_excerpt?: string | null
          response_excerpt?: string | null
          round_number?: number
          sponge_harmonic?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verifier_note?: string | null
          vitality?: string | null
          wallet_address?: string | null
          word?: string
          zk_proof_ref?: string | null
        }
        Relationships: []
      }
      oracle_history: {
        Row: {
          created_at: string
          glyph: string | null
          id: string
          model: string | null
          provider: string | null
          query: string | null
          response: string
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          glyph?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          query?: string | null
          response: string
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          glyph?: string | null
          id?: string
          model?: string | null
          provider?: string | null
          query?: string | null
          response?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      petitions: {
        Row: {
          btc_target: string
          btc_txid: string | null
          created_at: string
          error_message: string | null
          eth_recipient: string | null
          eth_txid: string | null
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          btc_target: string
          btc_txid?: string | null
          created_at?: string
          error_message?: string | null
          eth_recipient?: string | null
          eth_txid?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          btc_target?: string
          btc_txid?: string | null
          created_at?: string
          error_message?: string | null
          eth_recipient?: string | null
          eth_txid?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bonus_dream_images: number
          bonus_oracle_responses: number
          btc_address: string | null
          created_at: string
          display_name: string | null
          id: string
          tarot_credits: number
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          bonus_dream_images?: number
          bonus_oracle_responses?: number
          btc_address?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          tarot_credits?: number
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          bonus_dream_images?: number
          bonus_oracle_responses?: number
          btc_address?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          tarot_credits?: number
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          duration_days: number
          expires_at: string | null
          id: string
          max_uses: number | null
          note: string | null
          tier: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          tier: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          tier?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          code: string
          duration_days: number
          id: string
          period_end: string
          promo_code_id: string
          redeemed_at: string
          tier_granted: string
          user_id: string
        }
        Insert: {
          code: string
          duration_days: number
          id?: string
          period_end: string
          promo_code_id: string
          redeemed_at?: string
          tier_granted: string
          user_id: string
        }
        Update: {
          code?: string
          duration_days?: number
          id?: string
          period_end?: string
          promo_code_id?: string
          redeemed_at?: string
          tier_granted?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      query_usage: {
        Row: {
          created_at: string
          id: string
          query_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_attributions: {
        Row: {
          code: string
          created_at: string
          first_invoice_at: string | null
          id: string
          last_invoice_at: string | null
          referred_user_id: string
          referrer_user_id: string
          share_pct: number
          total_credited_cents: number
        }
        Insert: {
          code: string
          created_at?: string
          first_invoice_at?: string | null
          id?: string
          last_invoice_at?: string | null
          referred_user_id: string
          referrer_user_id: string
          share_pct: number
          total_credited_cents?: number
        }
        Update: {
          code?: string
          created_at?: string
          first_invoice_at?: string | null
          id?: string
          last_invoice_at?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          share_pct?: number
          total_credited_cents?: number
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          share_pct: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          share_pct?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          share_pct?: number
          user_id?: string
        }
        Relationships: []
      }
      rpc_endpoints: {
        Row: {
          chain_id: number | null
          created_at: string
          id: string
          label: string
          url: string
        }
        Insert: {
          chain_id?: number | null
          created_at?: string
          id?: string
          label: string
          url: string
        }
        Update: {
          chain_id?: number | null
          created_at?: string
          id?: string
          label?: string
          url?: string
        }
        Relationships: []
      }
      rpc_failure_log: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          failure_kind: string
          fallback_tier: string
          function_name: string
          id: string
          metadata: Json
          rpc_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failure_kind: string
          fallback_tier?: string
          function_name: string
          id?: string
          metadata?: Json
          rpc_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          failure_kind?: string
          fallback_tier?: string
          function_name?: string
          id?: string
          metadata?: Json
          rpc_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf: string | null
          period_end: string | null
          period_start: string | null
          receipt_url: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string
          stripe_subscription_id: string | null
          tier: string | null
          user_id: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          period_end?: string | null
          period_start?: string | null
          receipt_url?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
          tier?: string | null
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf?: string | null
          period_end?: string | null
          period_start?: string | null
          receipt_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
          tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          email: string
          id: string
          last_payment_failed_at: string | null
          latest_invoice_hosted_url: string | null
          latest_invoice_url: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          payment_status: string
          pending_tier: string | null
          pending_tier_effective_at: string | null
          referral_code: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          email: string
          id?: string
          last_payment_failed_at?: string | null
          latest_invoice_hosted_url?: string | null
          latest_invoice_url?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payment_status?: string
          pending_tier?: string | null
          pending_tier_effective_at?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          email?: string
          id?: string
          last_payment_failed_at?: string | null
          latest_invoice_hosted_url?: string | null
          latest_invoice_url?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payment_status?: string
          pending_tier?: string | null
          pending_tier_effective_at?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tarot_anonymous_usage: {
        Row: {
          cast_count: number
          created_at: string
          ip: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          cast_count?: number
          created_at?: string
          ip: string
          updated_at?: string
          usage_date: string
        }
        Update: {
          cast_count?: number
          created_at?: string
          ip?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      tart_claims: {
        Row: {
          amount: number
          btc_address: string
          created_at: string
          id: string
          inscription_id: string | null
          note: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          btc_address: string
          created_at?: string
          id?: string
          inscription_id?: string | null
          note?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          btc_address?: string
          created_at?: string
          id?: string
          inscription_id?: string | null
          note?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tart_ledger: {
        Row: {
          claim_id: string | null
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string
          receipt_id: string | null
          user_id: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          reason: string
          receipt_id?: string | null
          user_id: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string
          receipt_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tart_ledger_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "divination_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      terminal_audit: {
        Row: {
          args: Json
          command: string
          created_at: string
          credit_cost: number
          duration_ms: number | null
          error: string | null
          id: string
          status: string
          tier: string | null
          user_id: string
        }
        Insert: {
          args?: Json
          command: string
          created_at?: string
          credit_cost?: number
          duration_ms?: number | null
          error?: string | null
          id?: string
          status?: string
          tier?: string | null
          user_id: string
        }
        Update: {
          args?: Json
          command?: string
          created_at?: string
          credit_cost?: number
          duration_ms?: number | null
          error?: string | null
          id?: string
          status?: string
          tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tier_change_audit: {
        Row: {
          change_type: string
          created_at: string
          effective_at: string
          email: string | null
          from_tier: string | null
          id: string
          metadata: Json
          source: string
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_subscription_id: string | null
          to_tier: string
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          effective_at?: string
          email?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json
          source?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          to_tier: string
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          effective_at?: string
          email?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json
          source?: string
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
          to_tier?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_payments: {
        Row: {
          amount_eth: number
          amount_wei: number
          block_number: number | null
          chain_id: number
          created_at: string
          from_address: string
          id: string
          period_end: string
          period_start: string
          required_eth: number
          status: string
          tier: string
          to_address: string
          tx_hash: string
          user_id: string
          verified_at: string
        }
        Insert: {
          amount_eth: number
          amount_wei: number
          block_number?: number | null
          chain_id: number
          created_at?: string
          from_address: string
          id?: string
          period_end?: string
          period_start?: string
          required_eth: number
          status?: string
          tier: string
          to_address: string
          tx_hash: string
          user_id: string
          verified_at?: string
        }
        Update: {
          amount_eth?: number
          amount_wei?: number
          block_number?: number | null
          chain_id?: number
          created_at?: string
          from_address?: string
          id?: string
          period_end?: string
          period_start?: string
          required_eth?: number
          status?: string
          tier?: string
          to_address?: string
          tx_hash?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validator_cache: {
        Row: {
          address: string
          bond: number
          id: string
          last_seen: string
          raw_json: Json
        }
        Insert: {
          address: string
          bond?: number
          id?: string
          last_seen?: string
          raw_json?: Json
        }
        Update: {
          address?: string
          bond?: number
          id?: string
          last_seen?: string
          raw_json?: Json
        }
        Relationships: []
      }
      verified_contracts: {
        Row: {
          chain_id: number
          contract_address: string
          created_at: string
          decimals: number | null
          id: string
          name: string | null
          owner_address: string
          symbol: string | null
          total_supply: number | null
          tx_hash: string | null
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          chain_id: number
          contract_address: string
          created_at?: string
          decimals?: number | null
          id?: string
          name?: string | null
          owner_address: string
          symbol?: string | null
          total_supply?: number | null
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          chain_id?: number
          contract_address?: string
          created_at?: string
          decimals?: number | null
          id?: string
          name?: string | null
          owner_address?: string
          symbol?: string | null
          total_supply?: number | null
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      vm_terminal_sessions: {
        Row: {
          command: string
          duration_ms: number | null
          ended_at: string | null
          error_message: string | null
          exit_code: number | null
          host: string
          id: string
          session_id: string
          started_at: string
          status: string
          stderr: string
          stdout: string
          user_id: string
          username: string | null
        }
        Insert: {
          command: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          exit_code?: number | null
          host: string
          id?: string
          session_id: string
          started_at?: string
          status?: string
          stderr?: string
          stdout?: string
          user_id: string
          username?: string | null
        }
        Update: {
          command?: string
          duration_ms?: number | null
          ended_at?: string | null
          error_message?: string | null
          exit_code?: number | null
          host?: string
          id?: string
          session_id?: string
          started_at?: string
          status?: string
          stderr?: string
          stdout?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          converted_user_id: string | null
          created_at: string
          email: string
          id: string
          metadata: Json
          ref_code: string | null
          session_id: string | null
          source: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          converted_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          ref_code?: string | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          converted_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          ref_code?: string | null
          session_id?: string | null
          source?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_promo_codes: {
        Args: {
          _count: number
          _duration_days?: number
          _expires_at?: string
          _max_uses?: number
          _note?: string
          _prefix?: string
          _tier: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      admin_set_promo_active: {
        Args: { _active: boolean; _id: string }
        Returns: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          duration_days: number
          expires_at: string | null
          id: string
          max_uses: number | null
          note: string | null
          tier: string
          updated_at: string
          uses_count: number
        }
        SetofOptions: {
          from: "*"
          to: "promo_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aetx_balance: { Args: { _user_id: string }; Returns: number }
      apply_tier_payment: {
        Args: {
          _email: string
          _period_end: string
          _tier: string
          _user_id: string
        }
        Returns: undefined
      }
      auto_mine_tick: { Args: never; Returns: Json }
      award_tart_for_receipt: {
        Args: { _amount?: number; _receipt_id: string; _user_id: string }
        Returns: number
      }
      build_mining_anchor: {
        Args: { _period_minutes?: number }
        Returns: {
          anchored_at: string | null
          attestation_count: number
          attestation_ids: string[]
          chain_id: number | null
          contract_address: string | null
          created_at: string
          created_by: string | null
          id: string
          merkle_root: string
          onchain_tx_hash: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "mining_anchors"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      burn_aetx_for_seal: { Args: { _receipt_id: string }; Returns: Json }
      consume_query_quota: {
        Args: { _daily_limit?: number; _user_id: string }
        Returns: Json
      }
      consume_tarot_quota: { Args: { _user_id: string }; Returns: Json }
      consume_tarot_quota_anonymous: { Args: { _ip: string }; Returns: Json }
      credit_referral_invoice: {
        Args: {
          _amount_paid_cents: number
          _invoice_id: string
          _referred_user_id: string
        }
        Returns: Json
      }
      credits_balance: { Args: { _user_id: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dream_already_today: { Args: { _user_id: string }; Returns: boolean }
      dream_eligible_users: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_referral_code: { Args: { _user_id: string }; Returns: string }
      find_echo_reading: {
        Args: { _card_names: string[]; _exclude_nonce: string; _phase: string }
        Returns: {
          cards: Json
          issued_at: string
          phase: string
          tension: number
        }[]
      }
      funnel_summary: { Args: { _window_days?: number }; Returns: Json }
      get_public_brc20_tokens: {
        Args: { _network?: string; _tick?: string }
        Returns: {
          created_at: string
          decimals: number
          id: string
          inscription_id: string
          lim: number
          max: number
          network: string
          reveal_tx: string
          status: string
          tick: string
        }[]
      }
      get_public_ledger: {
        Args: { _limit?: number }
        Returns: {
          attestation_hash: string
          harmony: number
          id: string
          onchain_tx_hash: string
          round_number: number
          sponge_harmonic: number
          status: string
          submitted_at: string
          verified_at: string
          vitality: string
          wallet_address: string
          word: string
        }[]
      }
      get_user_bonuses: { Args: { _user_id: string }; Returns: Json }
      get_user_tier_state: { Args: { _user_id: string }; Returns: Json }
      grant_aetx: {
        Args: {
          _amount: number
          _reason: string
          _ref?: string
          _user_id: string
        }
        Returns: number
      }
      grant_tarot_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_auto_mine_eligible: { Args: { _user_id: string }; Returns: boolean }
      lookup_referral_code: {
        Args: { _code: string }
        Returns: {
          share_pct: number
          user_id: string
        }[]
      }
      match_caduceus_corpus: {
        Args: {
          _match_count?: number
          _min_similarity?: number
          _query_embedding: string
        }
        Returns: {
          aetherion_phase: string
          engine_state: Json
          harmony: number
          hexagram_number: number
          id: string
          resolution: string
          similarity: number
          word: string
        }[]
      }
      match_hexagram_docs: {
        Args: {
          _match_count?: number
          _min_similarity?: number
          _query_embedding: string
        }
        Returns: {
          content: string
          hexagram_number: number
          id: string
          kind: string
          similarity: number
          tags: string[]
          title: string
        }[]
      }
      match_user_memories: {
        Args: {
          _match_count?: number
          _min_similarity?: number
          _query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          similarity: number
          summary: string
        }[]
      }
      media_quota_used_this_month: {
        Args: { _user_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      phase_of_the_hour: {
        Args: never
        Returns: {
          cnt: number
          phase: string
          total: number
        }[]
      }
      public_stats: {
        Args: never
        Returns: {
          dreams_total: number
          readings_today: number
          readings_total: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_mining_attestation: {
        Args: {
          _attestation_hash: string
          _harmony: number
          _query_excerpt: string
          _response_excerpt: string
          _sponge_harmonic: number
          _vitality: string
          _word: string
          _zk_proof_ref?: string
        }
        Returns: {
          attestation_hash: string
          created_at: string
          harmony: number | null
          id: string
          onchain_tx_hash: string | null
          query_excerpt: string | null
          response_excerpt: string | null
          round_number: number
          sponge_harmonic: number | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verifier_note: string | null
          vitality: string | null
          wallet_address: string | null
          word: string
          zk_proof_ref: string | null
        }
        SetofOptions: {
          from: "*"
          to: "mining_attestations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_referral_signup: {
        Args: { _code: string; _referred_user_id: string }
        Returns: boolean
      }
      redeem_promo_code: { Args: { _code: string }; Returns: Json }
      request_aetx_claim: {
        Args: { _amount: number; _btc_address: string }
        Returns: {
          amount: number
          btc_address: string
          created_at: string
          id: string
          inscription_id: string | null
          note: string | null
          processed_at: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "aetx_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_tart_claim: {
        Args: { _amount: number; _btc_address: string }
        Returns: {
          amount: number
          btc_address: string
          created_at: string
          id: string
          inscription_id: string | null
          note: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tart_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rpc_failure_stats: {
        Args: { _window_minutes?: number }
        Returns: {
          failure_kind: string
          failures: number
          function_name: string
          last_at: string
          rpc_name: string
          unique_users: number
        }[]
      }
      spend_credits: {
        Args: {
          _amount: number
          _command?: string
          _reason: string
          _ref?: string
          _user_id: string
        }
        Returns: Json
      }
      tart_balance: { Args: { _user_id: string }; Returns: number }
      verify_divination_receipt: {
        Args: { _commitment_hash: string; _nonce: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
