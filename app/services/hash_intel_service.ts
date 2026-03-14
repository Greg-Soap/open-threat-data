import env from '#start/env'
import axios from 'axios'

export interface HashIntelResult {
  hash: string
  detected: boolean
  detectionCount?: number
  totalEngines?: number
  permalink?: string
  source?: 'virustotal' | 'malwarebazaar'
  malwareBazaar?: { fileName?: string; fileType?: string; firstSeen?: string }
  error?: string
}

export default class HashIntelService {
  async lookup(hash: string): Promise<HashIntelResult> {
    const trimmed = hash.trim().toLowerCase()
    const result: HashIntelResult = { hash: trimmed, detected: false }

    const vtKey = env.get('VIRUSTOTAL_API_KEY')
    const mbKey = env.get('MALWAREBAZAAR_API_KEY')

    if (vtKey) {
      const vtResult = await this.lookupVirusTotal(trimmed, result, vtKey)
      if (vtResult) return result
    }

    if (mbKey) {
      const mbResult = await this.lookupMalwareBazaar(trimmed, result, mbKey)
      if (mbResult) return result
    }

    if (!vtKey && !mbKey) {
      result.error =
        'No hash lookup configured. Set VIRUSTOTAL_API_KEY or MALWAREBAZAAR_API_KEY in .env.'
    } else if (!result.detected && !result.error) {
      result.error = 'Hash not found in VirusTotal or MalwareBazaar.'
    }

    return result
  }

  private async lookupVirusTotal(
    trimmed: string,
    result: HashIntelResult,
    apiKey: string
  ): Promise<boolean> {
    try {
      const res = await axios.get(
        `https://www.virustotal.com/api/v3/files/${encodeURIComponent(trimmed)}`,
        {
          headers: { 'x-apikey': apiKey },
          timeout: 15_000,
        },
      )
      const data = res.data?.data?.attributes
      if (data) {
        const stats = data.last_analysis_stats || {}
        const malicious = Number(stats.malicious) || 0
        const total =
          Number(stats.malicious) +
          Number(stats.suspicious) +
          Number(stats.harmless) +
          Number(stats.undetected) || 0
        result.detected = malicious > 0
        result.detectionCount = malicious
        result.totalEngines = total
        result.permalink = res.data?.data?.links?.self
        result.source = 'virustotal'
        return true
      }
    } catch (e: unknown) {
      const err = e as { response?: { status: number }; message?: string }
      if (err.response?.status !== 404) {
        result.error = err?.message || 'VirusTotal lookup failed'
        return true
      }
    }
    return false
  }

  private async lookupMalwareBazaar(
    trimmed: string,
    result: HashIntelResult,
    apiKey: string
  ): Promise<boolean> {
    try {
      const res = await axios.post(
        'https://mb-api.abuse.ch/api/v1/',
        new URLSearchParams({ query: 'get_info', hash: trimmed }).toString(),
        {
          headers: {
            'Auth-Key': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15_000,
        },
      )
      const data = res.data
      const status = data?.query_status
      if (status === 'hash_not_found' || status === 'illegal_hash' || status === 'no_hash_provided') {
        return false
      }
      if (status && status !== 'ok' && !data.sha256_hash) {
        return false
      }
      if (data?.sha256_hash) {
        result.detected = true
        result.detectionCount = 1
        result.totalEngines = 1
        result.permalink = `https://bazaar.abuse.ch/sample/${data.sha256_hash}/`
        result.source = 'malwarebazaar'
        result.malwareBazaar = {
          fileName: data.file_name,
          fileType: data.file_type,
          firstSeen: data.first_seen,
        }
        return true
      }
    } catch {
      // Optional: do not overwrite existing result
    }
    return false
  }
}
