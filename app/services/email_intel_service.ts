import * as dns from 'node:dns/promises'
import axios from 'axios'
import env from '#start/env'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface EmailIntelResult {
  input: string
  validFormat: boolean
  domain?: string
  mx?: { exchange: string; priority: number }[]
  mxResolved: boolean
  breached?: boolean
  breachCount?: number
  breaches?: string[]
  error?: string
}

interface HibpBreach {
  Name?: string
}

export default class EmailIntelService {
  async check(input: string): Promise<EmailIntelResult> {
    const trimmed = input.trim().toLowerCase()
    const result: EmailIntelResult = {
      input: trimmed,
      validFormat: EMAIL_REGEX.test(trimmed),
      mxResolved: false,
    }

    if (!result.validFormat) {
      result.error = 'Invalid email format'
      return result
    }

    const domain = trimmed.split('@')[1]
    if (!domain) return result
    result.domain = domain

    try {
      const mx = await dns.resolveMx(domain)
      result.mx = mx.map((r) => ({ exchange: r.exchange, priority: r.priority }))
      result.mxResolved = mx.length > 0
    } catch {
      result.mxResolved = false
    }

    const apiKey = env.get('HIBP_API_KEY')
    if (apiKey) {
      try {
        const res = await axios.get<HibpBreach[]>(
          `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(trimmed)}`,
          {
            headers: {
              'hibp-api-key': apiKey,
              'User-Agent': 'OpenThreatData-OSINT-Tool/1.0',
            },
            timeout: 10_000,
          },
        )
        const breaches = res.data
        if (Array.isArray(breaches) && breaches.length > 0) {
          result.breached = true
          result.breachCount = breaches.length
          result.breaches = breaches.map((b) => b.Name).filter(Boolean) as string[]
        } else {
          result.breached = false
        }
      } catch (e: unknown) {
        const err = e as { response?: { status: number } }
        if (err.response?.status !== 404) {
          // 404 = no breaches; other errors we don't overwrite result
        }
      }
    }

    return result
  }
}
