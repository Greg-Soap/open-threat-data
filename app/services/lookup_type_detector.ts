import type { LookupType } from '#models/lookup_history'

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:::(?:[0-9a-fA-F]{1,4}:)*){1,7}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}(?::(?:[0-9a-fA-F]{1,4}))*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/
const HEX_HASH_32 = /^[a-fA-F0-9]{32}$/
const HEX_HASH_64 = /^[a-fA-F0-9]{64}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface DetectedLookup {
  type: LookupType
  target: string
}

/**
 * Detect lookup type from a raw paste (hash, URL, domain, IP, email, host:port).
 * Order matters: URL → email → IP → ssl (host:port) → hash → domain.
 */
export function detectLookupType(raw: string): DetectedLookup {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { type: 'domain', target: trimmed }
  }

  const lower = trimmed.toLowerCase()

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return { type: 'url', target: trimmed }
  }

  if (EMAIL_REGEX.test(trimmed)) {
    return { type: 'email', target: trimmed }
  }

  if (IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed)) {
    return { type: 'ip', target: trimmed }
  }

  if (trimmed.includes(':') && !trimmed.startsWith('[')) {
    const lastColon = trimmed.lastIndexOf(':')
    const afterColon = trimmed.slice(lastColon + 1)
    const port = Number(afterColon)
    if (Number.isInteger(port) && port >= 1 && port <= 65535 && trimmed.slice(0, lastColon).length > 0) {
      return { type: 'ssl', target: trimmed }
    }
  }

  const hexOnly = trimmed.replace(/\s/g, '')
  if (HEX_HASH_32.test(hexOnly) || HEX_HASH_64.test(hexOnly)) {
    return { type: 'hash', target: hexOnly.toLowerCase() }
  }

  return { type: 'domain', target: trimmed }
}
