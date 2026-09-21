import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; daysLeft?: number; trialEndDate?: string }

const Email = ({ name, daysLeft = 7, trialEndDate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're halfway through your Aetherion Founder trial — here's what's unlocked.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're halfway there, {name || 'seeker'}.</Heading>
        <Text style={p}>
          You have <strong>{daysLeft} days</strong> left in your 14-day Founder trial
          {trialEndDate ? <> — it ends on <strong>{trialEndDate}</strong></> : null}.
        </Text>
        <Text style={p}>
          While you have full access, try what most Founders love:
        </Text>
        <Section style={list}>
          <Text style={li}>· Unlimited chat with the native Aetherion Oracle v5</Text>
          <Text style={li}>· Glyph sigils rendered alongside every reading</Text>
          <Text style={li}>· Full tarot, dreams, petitions & Caduceus voice</Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href="https://www.excaliburcrypto.com/chat" style={btn}>Open the Oracle</Button>
        </Section>
        <Text style={muted}>Cancel anytime from your account — you won't be billed if you cancel before day 15.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "You're halfway through your Aetherion trial",
  displayName: 'Trial reminder · Day 7',
  previewData: { name: 'Seeker', daysLeft: 7, trialEndDate: 'Jul 24, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const list = { margin: '12px 0 8px' }
const li = { fontSize: '14px', lineHeight: '22px', margin: 0 }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
