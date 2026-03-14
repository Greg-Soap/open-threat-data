import * as dns from 'node:dns/promises'
import * as net from 'node:net'
import axios from 'axios'

const IANA_WHOIS = 'whois.iana.org'
const WHOIS_PORT = 43
const WHOIS_TIMEOUT_MS = 10_000

function whoisQuery(host: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let data = ''
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('WHOIS timeout'))
    }, WHOIS_TIMEOUT_MS)
    socket.setEncoding('utf8')
    socket.on('data', (chunk) => {
      data += chunk
    })
    socket.on('close', () => {
      clearTimeout(timer)
      resolve(data)
    })
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    socket.connect(WHOIS_PORT, host, () => {
      socket.write(`${query}\r\n`, () => {
        socket.end()
      })
    })
  })
}

async function whoisLookup(domain: string): Promise<string> {
  const tld = domain.split('.').pop() ?? domain
  const ianaRaw = await whoisQuery(IANA_WHOIS, tld)
  const referMatch = ianaRaw.match(/refer:\s*(\S+)/im)
  const whoisHost = referMatch ? referMatch[1].trim() : IANA_WHOIS
  return whoisQuery(whoisHost, domain)
}

export interface WhoisInfo {
  registrar?: string
  created?: string
  expires?: string
  updated?: string
  nameServers?: string[]
}

export interface DomainIntelResult {
  domain: string
  a?: string[]
  aaaa?: string[]
  mx?: { exchange: string; priority: number }[]
  txt?: string[]
  ns?: string[]
  soa?: string
  whois?: WhoisInfo
  subdomainsFromCt?: string[]
  error?: string
}

function parseWhoisRaw(raw: string): WhoisInfo {
  const info: WhoisInfo = {}
  const lines = raw.split(/\r?\n/)
  const nameServers: string[] = []

  for (const line of lines) {
    const match = line.match(/^\s*([^:]+):\s*(.+)\s*$/)
    if (!match) continue
    const key = match[1].trim().toLowerCase()
    const value = match[2].trim()

    if (key.includes('registrar') && !key.includes('url')) {
      info.registrar = value
    } else if (
      key.includes('creation') ||
      key === 'created' ||
      key === 'registered'
    ) {
      info.created = value
    } else if (
      key.includes('expir') ||
      key === 'expires' ||
      key === 'paid-till'
    ) {
      info.expires = value
    } else if (key.includes('updated') || key === 'last updated') {
      info.updated = value
    } else if (
      key.includes('name server') ||
      key === 'nserver' ||
      key === 'nameserver'
    ) {
      const ns = value.split(/\s+/)[0]
      if (ns && !nameServers.includes(ns)) nameServers.push(ns)
    }
  }

  if (nameServers.length > 0) info.nameServers = nameServers
  return info
}

export default class DomainIntelService {
  async lookup(domain: string): Promise<DomainIntelResult> {
    const host = domain.trim().replace(/^https?:\/\//, '').split('/')[0].toLowerCase()
    const result: DomainIntelResult = { domain: host }

    try {
      const [a, aaaa, mx, txt, ns] = await Promise.allSettled([
        dns.resolve4(host),
        dns.resolve6(host),
        dns.resolveMx(host),
        dns.resolveTxt(host),
        dns.resolveNs(host),
      ])

      if (a.status === 'fulfilled') result.a = a.value
      if (aaaa.status === 'fulfilled') result.aaaa = aaaa.value
      if (mx.status === 'fulfilled')
        result.mx = mx.value.map((r) => ({ exchange: r.exchange, priority: r.priority }))
      if (txt.status === 'fulfilled') result.txt = txt.value.map((arr) => arr.join(' '))
      if (ns.status === 'fulfilled') result.ns = ns.value
    } catch (e) {
      result.error = e instanceof Error ? e.message : 'DNS lookup failed'
    }

    try {
      const raw = await whoisLookup(host)
      if (raw && typeof raw === 'string') {
        result.whois = parseWhoisRaw(raw)
      }
    } catch {
      // WHOIS optional: do not set result.error
    }

    try {
      const subdomains = await this.getSubdomainsFromCt(host)
      if (subdomains.length > 0) result.subdomainsFromCt = subdomains
    } catch {
      // crt.sh optional
    }

    return result
  }

  private async getSubdomainsFromCt(domain: string): Promise<string[]> {
    const query = `%.${domain}`
    const res = await axios.get<{ name_value?: string }[]>(
      `https://crt.sh/?q=${encodeURIComponent(query)}&output=json`,
      { timeout: 15_000 },
    )
    const data = res.data
    if (!Array.isArray(data)) return []
    const set = new Set<string>()
    const base = domain.toLowerCase()
    for (const row of data) {
      const nameValue = row?.name_value
      if (!nameValue || typeof nameValue !== 'string') continue
      const parts = nameValue.split(/\n/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      for (const name of parts) {
        if (name.startsWith('*.')) continue
        if (name === base || name.endsWith('.' + base)) set.add(name)
      }
    }
    return [...set].sort()
  }
}
