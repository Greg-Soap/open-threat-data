import env from '#start/env'
import axios from 'axios'

export interface UrlThreatCheck {
  safe: boolean
  threats: string[]
  source: 'urlhaus' | 'safebrowsing'
  urlhausReference?: string
  urlhausThreat?: string
  urlhausTags?: string[]
}

export default class UrlReputationService {
  async check(url: string): Promise<UrlThreatCheck | null> {
    const urlhausResult = await this.checkUrlhaus(url)
    if (urlhausResult) return urlhausResult

    const sbResult = await this.checkSafeBrowsing(url)
    if (sbResult) return sbResult

    return null
  }

  private async checkUrlhaus(url: string): Promise<UrlThreatCheck | null> {
    const apiKey = env.get('URLHAUS_API_KEY')
    if (!apiKey) return null

    try {
      const res = await axios.post(
        'https://urlhaus-api.abuse.ch/v1/url/',
        new URLSearchParams({ url }).toString(),
        {
          headers: {
            'Auth-Key': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10_000,
        },
      )
      const data = res.data
      const status = data?.query_status
      if (status === 'ok' && data?.url) {
        const threat = data.threat || 'malware'
        const tags = Array.isArray(data.tags) ? data.tags : []
        return {
          safe: false,
          threats: [threat, ...tags].filter(Boolean),
          source: 'urlhaus',
          urlhausReference: data.urlhaus_reference,
          urlhausThreat: data.threat,
          urlhausTags: tags,
        }
      }
    } catch {
      // Optional: do not fail the whole request
    }
    return null
  }

  private async checkSafeBrowsing(url: string): Promise<UrlThreatCheck | null> {
    const apiKey = env.get('GOOGLE_SAFEBROWSING_API_KEY')
    if (!apiKey) return null

    try {
      const res = await axios.post<{ matches?: { threatType?: string }[] }>(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
        {
          client: { clientId: 'open-threat-data', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url }],
          },
        },
        { timeout: 10_000 },
      )
      const matches = res.data?.matches
      if (matches && matches.length > 0) {
        const threats = [...new Set(matches.map((m) => m.threatType).filter(Boolean))] as string[]
        return {
          safe: false,
          threats,
          source: 'safebrowsing',
        }
      }
      return { safe: true, threats: [], source: 'safebrowsing' }
    } catch {
      return null
    }
  }
}
