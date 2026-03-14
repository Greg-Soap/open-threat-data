import type { SharedProps } from '@adonisjs/inertia/types'
import { Head, Link } from '@inertiajs/react'
import {
  Globe,
  Hash,
  Link as LinkIcon,
  Mail,
  Server,
  Shield,
  Gauge,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { PublicLayout } from '@/components/layouts/public'
import { CheckedBy, type CheckedByEntry } from '@/components/tools/checked-by'
import {
  LookupComments,
  type CommentEntry,
  type LookupType,
} from '@/components/tools/lookup-comments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface LookupPageProps extends SharedProps {
  type: LookupType | null
  target: string | null
  result: unknown
  checkedBy: CheckedByEntry[]
  comments: CommentEntry[]
  error: string | null
}

const TYPE_LABELS: Record<string, string> = {
  ip: 'IP Intelligence',
  domain: 'Domain Intelligence',
  hash: 'Hash Analysis',
  ssl: 'SSL Certificate',
  email: 'Email Reputation',
  latency: 'Latency',
  url: 'URL Tracer',
}

function typeIcon(type: string) {
  switch (type) {
    case 'ip':
      return <Globe className="h-5 w-5" />
    case 'domain':
      return <Server className="h-5 w-5" />
    case 'hash':
      return <Hash className="h-5 w-5" />
    case 'ssl':
      return <Shield className="h-5 w-5" />
    case 'email':
      return <Mail className="h-5 w-5" />
    case 'latency':
      return <Gauge className="h-5 w-5" />
    case 'url':
      return <LinkIcon className="h-5 w-5" />
    default:
      return <Search className="h-5 w-5" />
  }
}

export default function Lookup(props: LookupPageProps) {
  const isLoggedIn = Boolean(props.isLoggedIn)
  const { type, target, result, checkedBy, comments, error } = props

  return (
    <PublicLayout>
      <Head title={target ? `Lookup: ${target}` : 'Lookup'} />
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5" />
              Look up anything
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/lookup" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="text"
                name="q"
                defaultValue={target ?? ''}
                placeholder="Paste a hash, URL, domain, IP, or email…"
                className="flex-1 min-w-0"
                aria-label="Search"
              />
              <Button type="submit">Look up</Button>
            </form>
          </CardContent>
        </Card>

        {!type && !target && !error && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>Enter a hash, URL, domain, IP, or email above to see results.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/">Back to home</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="py-6">
              <p className="text-destructive font-medium">{error}</p>
              {target && (
                <p className="text-sm text-muted-foreground mt-1">
                  Target: {target} (detected as {type ?? 'unknown'})
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {type && target && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {typeIcon(type)}
                  {TYPE_LABELS[type] ?? type}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result != null && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                    <ResultByType type={type} result={result} />
                  </div>
                )}
                {checkedBy.length > 0 && (
                  <CheckedBy entries={checkedBy} targetLabel={target} />
                )}
                <LookupComments
                  type={type}
                  target={target}
                  targetLabel={target}
                  initialComments={comments}
                  canComment={isLoggedIn}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PublicLayout>
  )
}

function ResultByType({ type, result }: { type: string; result: unknown }) {
  const r = result as Record<string, unknown>

  if (type === 'ip') {
    const res = r as {
      ip?: string
      country?: string
      countryCode?: string
      region?: string
      city?: string
      isp?: string
      org?: string
      as?: string
      abuseScore?: number
      greyNoise?: { classification?: string; name?: string; riot?: boolean; noise?: boolean; link?: string }
      otx?: { pulseCount?: number; pulseNames?: string[]; reputation?: number }
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">IP:</span> {res.ip}</p>
        {res.country != null && <p><span className="font-medium">Country:</span> {res.country} ({res.countryCode})</p>}
        {res.region != null && <p><span className="font-medium">Region:</span> {res.region}</p>}
        {res.city != null && <p><span className="font-medium">City:</span> {res.city}</p>}
        {res.isp != null && <p><span className="font-medium">ISP:</span> {res.isp}</p>}
        {res.org != null && <p><span className="font-medium">Org:</span> {res.org}</p>}
        {res.as != null && <p><span className="font-medium">AS:</span> {res.as}</p>}
        {res.abuseScore != null && <p><span className="font-medium">Abuse score:</span> {res.abuseScore}</p>}
        {res.greyNoise && (
          <div className="mt-2 pt-2 border-t">
            <p className="font-medium">GreyNoise</p>
            {res.greyNoise.classification != null && <p><span className="font-medium">Classification:</span> {res.greyNoise.classification}</p>}
            {res.greyNoise.link && <a href={res.greyNoise.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View in GreyNoise</a>}
          </div>
        )}
        {res.otx && (res.otx.pulseCount != null || res.otx.reputation != null) && (
          <div className="mt-2 pt-2 border-t">
            <p className="font-medium">AlienVault OTX</p>
            {res.otx.pulseCount != null && <p><span className="font-medium">Pulses:</span> {res.otx.pulseCount}</p>}
            {res.otx.reputation != null && <p><span className="font-medium">Reputation:</span> {res.otx.reputation}</p>}
          </div>
        )}
      </>
    )
  }

  if (type === 'domain') {
    const res = r as {
      domain?: string
      a?: string[]
      aaaa?: string[]
      mx?: { exchange: string; priority: number }[]
      txt?: string[]
      ns?: string[]
      whois?: { registrar?: string; created?: string; expires?: string; updated?: string; nameServers?: string[] }
      subdomainsFromCt?: string[]
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Domain:</span> {res.domain}</p>
        {res.a?.length ? <p><span className="font-medium">A:</span> {res.a.join(', ')}</p> : null}
        {res.aaaa?.length ? <p><span className="font-medium">AAAA:</span> {res.aaaa.join(', ')}</p> : null}
        {res.mx?.length ? <p><span className="font-medium">MX:</span> {res.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ')}</p> : null}
        {res.ns?.length ? <p><span className="font-medium">NS:</span> {res.ns.join(', ')}</p> : null}
        {res.whois && Object.keys(res.whois).length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <p className="font-medium">WHOIS</p>
            {res.whois.registrar && <p><span className="font-medium">Registrar:</span> {res.whois.registrar}</p>}
            {res.whois.created && <p><span className="font-medium">Created:</span> {res.whois.created}</p>}
            {res.whois.expires && <p><span className="font-medium">Expires:</span> {res.whois.expires}</p>}
            {res.subdomainsFromCt && res.subdomainsFromCt.length > 0 && (
              <p><span className="font-medium">Subdomains (CT):</span> {res.subdomainsFromCt.slice(0, 10).join(', ')}{res.subdomainsFromCt.length > 10 ? ` +${res.subdomainsFromCt.length - 10} more` : ''}</p>
            )}
          </div>
        )}
      </>
    )
  }

  if (type === 'hash') {
    const res = r as {
      hash?: string
      detected?: boolean
      detectionCount?: number
      totalEngines?: number
      source?: string
      malwareBazaar?: { fileName?: string; fileType?: string; firstSeen?: string }
      permalink?: string
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Hash:</span> {res.hash}</p>
        <p><span className="font-medium">Detected:</span> {res.detected ? 'Yes' : 'No'}</p>
        {res.source && <p><span className="font-medium">Source:</span> {res.source}</p>}
        {res.detectionCount != null && <p><span className="font-medium">Detections:</span> {res.detectionCount} / {res.totalEngines ?? '—'}</p>}
        {res.malwareBazaar?.fileName && <p><span className="font-medium">File:</span> {res.malwareBazaar.fileName}</p>}
        {res.permalink && <a href={res.permalink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View report</a>}
      </>
    )
  }

  if (type === 'ssl') {
    const res = r as {
      host?: string
      port?: number
      valid?: boolean
      validFrom?: string
      validTo?: string
      issuer?: string
      subjectAltNames?: string[]
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Host:Port:</span> {res.host}:{res.port}</p>
        <p><span className="font-medium">Valid:</span> {res.valid ? 'Yes' : 'No'}</p>
        {res.validFrom && <p><span className="font-medium">Valid from:</span> {res.validFrom}</p>}
        {res.validTo && <p><span className="font-medium">Valid to:</span> {res.validTo}</p>}
        {res.issuer && <p><span className="font-medium">Issuer:</span> {res.issuer}</p>}
        {res.subjectAltNames?.length ? <p><span className="font-medium">SANs:</span> {res.subjectAltNames.join(', ')}</p> : null}
      </>
    )
  }

  if (type === 'email') {
    const res = r as {
      input?: string
      validFormat?: boolean
      domain?: string
      mx?: { exchange: string; priority: number }[]
      mxResolved?: boolean
      breached?: boolean
      breachCount?: number
      breaches?: string[]
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Format valid:</span> {res.validFormat ? 'Yes' : 'No'}</p>
        {res.domain && <p><span className="font-medium">Domain:</span> {res.domain}</p>}
        <p><span className="font-medium">MX resolved:</span> {res.mxResolved ? 'Yes' : 'No'}</p>
        {res.mx?.length ? <p><span className="font-medium">MX:</span> {res.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ')}</p> : null}
        {res.breached != null && (
          <p><span className="font-medium">Breach check (HIBP):</span> {res.breached ? `Yes — ${res.breachCount ?? 0} breach(es)` : 'No breaches found'}</p>
        )}
        {res.breached && res.breaches && res.breaches.length > 0 && (
          <ul className="list-disc list-inside text-destructive mt-1">
            {res.breaches.slice(0, 10).map((b) => <li key={b}>{b}</li>)}
            {res.breaches.length > 10 && <li className="text-muted-foreground">+ {res.breaches.length - 10} more</li>}
          </ul>
        )}
      </>
    )
  }

  if (type === 'latency') {
    const res = r as { target?: string; latencyMs?: number | null; statusCode?: number; error?: string }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Target:</span> {res.target}</p>
        <p><span className="font-medium">Latency:</span> {res.latencyMs != null ? `${res.latencyMs} ms` : '—'}</p>
        {res.statusCode != null && <p><span className="font-medium">Status:</span> {res.statusCode}</p>}
      </>
    )
  }

  if (type === 'url') {
    const res = r as {
      initialUrl?: string
      finalUrl?: string
      steps?: { url: string; statusCode?: number }[]
      chainLength?: number
      threatCheck?: {
        safe: boolean
        threats: string[]
        source: string
        urlhausReference?: string
      }
      error?: string
    }
    if (res.error) return <p className="text-destructive">{res.error}</p>
    return (
      <>
        <p><span className="font-medium">Initial:</span> {res.initialUrl}</p>
        <p><span className="font-medium">Final:</span> {res.finalUrl}</p>
        <p><span className="font-medium">Redirects:</span> {res.chainLength}</p>
        {res.steps?.length ? (
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {res.steps.map((s) => (
              <li key={`${s.statusCode ?? ''}-${s.url}`}>{s.statusCode != null ? `[${s.statusCode}] ` : ''}{s.url}</li>
            ))}
          </ul>
        ) : null}
        {res.threatCheck != null && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            {res.threatCheck.safe ? (
              <><Shield className="h-4 w-4 text-green-600" /> Threat check: No threats ({res.threatCheck.source})</>
            ) : (
              <><ShieldAlert className="h-4 w-4 text-destructive" /> Threat check: Threats detected ({res.threatCheck.source})</>
            )}
            {!res.threatCheck.safe && res.threatCheck.threats?.length ? (
              <ul className="list-disc list-inside text-destructive mt-1">
                {res.threatCheck.threats.map((t) => <li key={t}>{t}</li>)}
              </ul>
            ) : null}
            {res.threatCheck.urlhausReference && (
              <a href={res.threatCheck.urlhausReference} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs block mt-1">View URLhaus report</a>
            )}
          </div>
        )}
      </>
    )
  }

  return <p className="text-muted-foreground">No preview for this type.</p>
}
