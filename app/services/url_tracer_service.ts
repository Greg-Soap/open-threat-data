import axios from 'axios'

export interface RedirectStep {
  url: string
  statusCode?: number
}

export interface UrlTracerResult {
  initialUrl: string
  finalUrl: string
  steps: RedirectStep[]
  chainLength: number
  error?: string
}

const MAX_REDIRECTS = 10

export default class UrlTracerService {
  async trace(url: string): Promise<UrlTracerResult> {
    const initial = url.startsWith('http') ? url : `https://${url}`
    const steps: RedirectStep[] = []
    let currentUrl = initial

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      try {
        const res = await axios.get(currentUrl, {
          maxRedirects: 0,
          timeout: 15_000,
          validateStatus: (status) => status >= 200 && status < 400,
        })
        steps.push({ url: currentUrl, statusCode: res.status })
        return {
          initialUrl: initial,
          finalUrl: currentUrl,
          steps,
          chainLength: steps.length,
        }
      } catch (e: unknown) {
        const err = e as { response?: { status: number; headers?: { location?: string } }; message?: string }
        const status = err.response?.status
        const location = err.response?.headers?.location

        steps.push({ url: currentUrl, statusCode: status })

        if (status && status >= 300 && status < 400 && location) {
          currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href
          continue
        }

        return {
          initialUrl: initial,
          finalUrl: currentUrl,
          steps,
          chainLength: steps.length,
          error: err?.message || 'Trace failed',
        }
      }
    }

    return {
      initialUrl: initial,
      finalUrl: currentUrl,
      steps,
      chainLength: steps.length,
      error: `Max redirects (${MAX_REDIRECTS}) exceeded`,
    }
  }
}
