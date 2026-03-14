import env from '#start/env'
import axios from 'axios'

export interface GreyNoiseInfo {
  classification?: string
  name?: string
  riot?: boolean
  noise?: boolean
  link?: string
}

export interface OtxInfo {
  pulseCount?: number
  pulseNames?: string[]
  reputation?: number
}

export interface IpIntelResult {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  city?: string
  zip?: string
  lat?: number
  lon?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
  reverse?: string
  abuseScore?: number
  abuseData?: unknown
  greyNoise?: GreyNoiseInfo
  otx?: OtxInfo
  error?: string
}

export default class IpIntelService {
  async lookup(ip: string): Promise<IpIntelResult> {
    const result: IpIntelResult = { ip: ip.trim() }

    try {
      const res = await axios.get(
        `http://ip-api.com/json/${encodeURIComponent(result.ip)}?fields=status,message,country,countryCode,region,city,zip,lat,lon,timezone,isp,org,as,query`,
        { timeout: 10_000 },
      )
      const data = res.data
      if (data.status === 'fail') {
        result.error = data.message || 'Lookup failed'
        return result
      }
      result.country = data.country
      result.countryCode = data.countryCode
      result.region = data.region
      result.city = data.city
      result.zip = data.zip
      result.lat = data.lat
      result.lon = data.lon
      result.timezone = data.timezone
      result.isp = data.isp
      result.org = data.org
      result.as = data.as
    } catch (e) {
      result.error = e instanceof Error ? e.message : 'IP lookup failed'
    }

    const abuseKey = env.get('ABUSEIPDB_API_KEY')
    if (abuseKey) {
      try {
        const abuseRes = await axios.get(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(result.ip)}`,
          {
            headers: { Key: abuseKey, Accept: 'application/json' },
            timeout: 10_000,
          },
        )
        const d = abuseRes.data?.data
        if (d) {
          result.abuseScore = d.abuseConfidenceScore
          result.abuseData = d
        }
      } catch {
        // Optional: do not set result.error, keep geo data
      }
    }

    const greyNoiseKey = env.get('GREYNOISE_API_KEY')
    if (greyNoiseKey && this.isIPv4(result.ip)) {
      try {
        const gnRes = await axios.get(
          `https://api.greynoise.io/v3/community/${encodeURIComponent(result.ip)}`,
          { headers: { key: greyNoiseKey }, timeout: 10_000 },
        )
        const gn = gnRes.data
        if (gn && (gn.noise !== undefined || gn.riot !== undefined)) {
          result.greyNoise = {
            classification: gn.classification,
            name: gn.name,
            riot: gn.riot,
            noise: gn.noise,
            link: gn.link,
          }
        }
      } catch {
        // Optional
      }
    }

    const otxKey = env.get('OTX_API_KEY')
    if (otxKey) {
      try {
        const type = this.isIPv4(result.ip) ? 'IPv4' : 'IPv6'
        const otxRes = await axios.get(
          `https://otx.alienvault.com/api/v1/indicators/${type}/${encodeURIComponent(result.ip)}/general`,
          {
            headers: { 'X-OTX-API-KEY': otxKey },
            timeout: 10_000,
          },
        )
        const otxData = otxRes.data
        if (otxData) {
          const pulseCount = otxData.pulse_info?.count ?? 0
          const pulseNames = (otxData.pulse_info?.pulses ?? []).map((p: { name?: string }) => p.name).filter(Boolean)
          result.otx = {
            pulseCount,
            pulseNames: pulseNames.slice(0, 10),
            reputation: otxData.reputation,
          }
        }
      } catch {
        // Optional
      }
    }

    return result
  }

  private isIPv4(ip: string): boolean {
    return !ip.includes(':')
  }
}
