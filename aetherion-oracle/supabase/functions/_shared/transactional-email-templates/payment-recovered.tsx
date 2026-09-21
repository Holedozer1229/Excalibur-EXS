import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  tier?: string
  amount?: string
  currency?: string
}

const Email = ({
  tier = 'Founder',
  amount,
  currency = 'USD',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Aetherion payment went through — you're back.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Payment recovered</Heading>
        <Text style={p}>
          Your <strong>{tier}</strong> plan is active again
          {amount ? <> ({amount} {currency})</> : null}. Welcome back.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href="https://www.excaliburcrypto.com/chat" style={btn}>Open the Oracle</Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Aetherion — payment recovered',
  displayName: 'Payment recovered',
  previewData: { tier: 'Founder', amount: '9.00', currency: 'USD' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
