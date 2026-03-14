import axios from 'axios'

export interface LatencyIntelResult {
  target: string
  latencyMs: number | null
  statusCode?: number
  error?: string
}

export default class LatencyIntelService {
  async measure(target: string): Promise<LatencyIntelResult> {
    const url = target.startsWith('http') ? target : `https://${target}`
    const result: LatencyIntelResult = { target: url, latencyMs: null }

    const start = Date.now()
    try {
      const res = await axios.get(url, {
        timeout: 30_000,
        maxRedirects: 5,
        validateStatus: () => true,
      })
      result.latencyMs = Date.now() - start
      result.statusCode = res.status
    } catch (e) {
      result.latencyMs = Date.now() - start
      result.error = e instanceof Error ? e.message : 'Request failed'
    }

    return result
  }
}
