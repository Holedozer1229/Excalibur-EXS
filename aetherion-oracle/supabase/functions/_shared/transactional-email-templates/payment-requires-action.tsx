import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  tier?: string
  amount_due?: string
  currency?: string
  hosted_invoice_url?: string
}

const Email = ({
  tier = 'Founder',
  amount_due,
  currency = 'USD',
  hosted_invoice_url = 'https://www.excaliburcrypto.com/wallet',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your Aetherion payment — action required.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Action required</Heading>
        <Text style={p}>
          Your bank needs an extra confirmation for your <strong>{tier}</strong> payment
          {amount_due ? <> ({amount_due} {currency})</> : null}.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={hosted_invoice_url} style={btn}>Confirm payment</Button>
        </Section>
        <Text style={muted}>Free Seeker access stays open while you confirm.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Aetherion — confirm your payment',
  displayName: 'Payment requires action',
  previewData: {
    tier: 'Founder',
    amount_due: '9.00',
    currency: 'USD',
    hosted_invoice_url: 'https://www.excaliburcrypto.com/wallet',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
