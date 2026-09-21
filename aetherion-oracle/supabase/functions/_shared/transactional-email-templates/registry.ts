import type { ComponentType } from 'npm:react@18.3.1'
import { template as trialDay7 } from './trial-reminder-day7.tsx'
import { template as trialDay12 } from './trial-reminder-day12.tsx'
import { template as trialDay13 } from './trial-reminder-day13.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as paymentRequiresAction } from './payment-requires-action.tsx'
import { template as subscriptionDowngraded } from './subscription-downgraded.tsx'
import { template as paymentRecovered } from './payment-recovered.tsx'
import { template as subscriptionRenewed } from './subscription-renewed.tsx'
import { template as welcome } from './welcome.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: (data: any) => string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'trial-reminder-day7': trialDay7,
  'trial-reminder-day12': trialDay12,
  'trial-reminder-day13': trialDay13,
  'payment-failed': paymentFailed,
  'payment-requires-action': paymentRequiresAction,
  'subscription-downgraded': subscriptionDowngraded,
  'payment-recovered': paymentRecovered,
  'subscription-renewed': subscriptionRenewed,
  'welcome': welcome,
}
