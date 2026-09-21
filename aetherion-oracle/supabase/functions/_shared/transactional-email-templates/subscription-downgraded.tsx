import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  tier?: string
  hosted_invoice_url?: string
}

const Email = ({
  tier = 'Founder',
  hosted_invoice_url = 'https://www.excaliburcrypto.com/auth',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetherion plan moved back to free Seeker access.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Back on free Seeker</Heading>
        <Text style={p}>
          Your <strong>{tier}</strong> subscription could not renew, so we moved you to free Seeker access.
          Caduceus chat, tarot, and the on-host oracle stay open — no card required.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={hosted_invoice_url} style={btn}>Restore Founder</Button>
        </Section>
        <Text style={muted}>You can re-subscribe anytime from your account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Aetherion — back on free Seeker access',
  displayName: 'Subscription downgraded',
  previewData: {
    tier: 'Founder',
    hosted_invoice_url: 'https://www.excaliburcrypto.com/auth',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
