import * as tls from 'node:tls'

export interface SslIntelResult {
  host: string
  port: number
  valid: boolean
  validFrom?: string
  validTo?: string
  issuer?: string
  subject?: string
  subjectAltNames?: string[]
  error?: string
}

export default class SslIntelService {
  async inspect(host: string, port = 443): Promise<SslIntelResult> {
    const result: SslIntelResult = { host: host.trim(), port: Number(port) || 443, valid: false }

    return new Promise((resolve) => {
      const socket = tls.connect(
        { host: result.host, port: result.port, servername: result.host, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate(false)
          socket.end()

          if (!cert || Object.keys(cert).length === 0) {
            result.valid = false
            result.error = 'No certificate received'
            resolve(result)
            return
          }

          result.validFrom = cert.valid_from
          result.validTo = cert.valid_to
          result.issuer = cert.issuer ? JSON.stringify(cert.issuer) : undefined
          result.subject = cert.subject ? JSON.stringify(cert.subject) : undefined
          result.subjectAltNames = cert.subjectaltname
            ? cert.subjectaltname.split(', ').map((s) => s.replace(/^DNS:/, ''))
            : undefined

          const now = new Date()
          const validTo = cert.valid_to ? new Date(cert.valid_to) : null
          result.valid = !!validTo && validTo > now

          resolve(result)
        },
      )

      socket.on('error', (err) => {
        result.valid = false
        result.error = err.message || 'TLS connection failed'
        resolve(result)
      })

      socket.setTimeout(15_000, () => {
        socket.destroy()
        result.valid = false
        result.error = 'Connection timeout'
        resolve(result)
      })
    })
  }
}
