import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  tier?: string
  amount_due?: string
  currency?: string
  hosted_invoice_url?: string
  next_attempt?: string | null
}

const Email = ({
  tier = 'Founder',
  amount_due,
  currency = 'USD',
  hosted_invoice_url = 'https://www.excaliburcrypto.com/wallet',
  next_attempt,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetherion payment needs attention.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment failed</Heading>
        <Text style={p}>
          We could not charge your card for your <strong>{tier}</strong> plan
          {amount_due ? <> ({amount_due} {currency})</> : null}.
        </Text>
        {next_attempt ? (
          <Text style={p}>Stripe will retry around <strong>{new Date(next_attempt).toUTCString()}</strong>.</Text>
        ) : (
          <Text style={p}>Update your payment method to keep full access.</Text>
        )}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={hosted_invoice_url} style={btn}>Update payment</Button>
        </Section>
        <Text style={muted}>You still have free Caduceus access on the Seeker tier while this is pending.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Aetherion — payment failed',
  displayName: 'Payment failed',
  previewData: {
    tier: 'Founder',
    amount_due: '9.00',
    currency: 'USD',
    hosted_invoice_url: 'https://www.excaliburcrypto.com/wallet',
    next_attempt: '2026-08-31T12:00:00.000Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
