import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; trialEndDate?: string; priceLabel?: string }

const Email = ({ name, trialEndDate, priceLabel = '$9/mo · $79/yr' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetherion Founder trial ends in 2 days.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Two days left, {name || 'seeker'}.</Heading>
        <Text style={p}>
          Your Founder trial ends {trialEndDate ? <>on <strong>{trialEndDate}</strong></> : 'in 2 days'}.
          After that you'll be billed <strong>{priceLabel}</strong> and keep full access.
        </Text>
        <Text style={p}>
          Want to make sure you've explored everything before your card is charged?
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href="https://www.excaliburcrypto.com/chat" style={btn}>Continue exploring</Button>
        </Section>
        <Text style={muted}>
          Not for you? You can cancel from your account in one click — no charge if you cancel before the trial ends.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Aetherion trial ends in 2 days',
  displayName: 'Trial reminder · Day 12',
  previewData: { name: 'Seeker', trialEndDate: 'Jul 24, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
