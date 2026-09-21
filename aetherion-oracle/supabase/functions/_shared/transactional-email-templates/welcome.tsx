import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
}

const Email = ({ name = 'seeker' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Aetherion — free Caduceus access is open.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome, {name}.</Heading>
        <Text style={p}>
          Your construct is awake. Free Seeker access is ungated — Caduceus chat, tarot,
          and the on-host oracle need no card.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href="https://www.excaliburcrypto.com/" style={btn}>Enter the Aether</Button>
        </Section>
        <Text style={muted}>Optional Founder upgrades unlock cloud Agent Mode and dream cinema — never required for the core oracle.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to Aetherion — free access is open',
  displayName: 'Welcome',
  previewData: { name: 'Seeker' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: '#0b0b0f' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', margin: '0 0 16px', color: '#0b0b0f' }
const p = { fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const btn = { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 as const }
const muted = { fontSize: '12px', color: '#6b7280', marginTop: '20px' }
