import { Head } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Loader2, Play, Server, Square } from 'lucide-react'
import { toast } from 'sonner'
import { CheckedBy, type CheckedByEntry } from '@/components/tools/checked-by'
import { LookupComments, type CommentEntry } from '@/components/tools/lookup-comments'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/http'

const DOMAIN_POLL_INTERVAL_MS = 30_000
const DOMAIN_MONITORING_MAX_DURATION_MS = 300_000
const MAX_DOMAIN_SAMPLES = 10

interface WhoisInfo {
  registrar?: string
  created?: string
  expires?: string
  updated?: string
  nameServers?: string[]
}

interface DomainResult {
  domain: string
  a?: string[]
  aaaa?: string[]
  mx?: { exchange: string; priority: number }[]
  txt?: string[]
  ns?: string[]
  whois?: WhoisInfo
  subdomainsFromCt?: string[]
  error?: string
}

interface DomainSample {
  index: number
  t: number
  a: string[]
  aaaa: string[]
  error?: string
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const x of b) if (!sa.has(x)) return false
  return true
}

export default function ToolDomain() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [domainSamples, setDomainSamples] = useState<DomainSample[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: DomainResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/domain', { target })
      return res.data
    },
    onSuccess: () => setDomainSamples([]),
    onError: () => toast.error('Lookup failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const fetchDomainSample = useCallback(async (target: string): Promise<DomainResult | null> => {
    try {
      const res = await api.get<{ result: DomainResult }>(
        `/intel/domain/sample?target=${encodeURIComponent(target)}`
      )
      return res.data.result
    } catch {
      return null
    }
  }, [])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current)
      maxDurationRef.current = null
    }
    setIsMonitoring(false)
  }, [])

  const startMonitoring = useCallback(() => {
    const target = formik.values.target.trim()
    if (!target) {
      toast.error('Enter a domain')
      return
    }
    setDomainSamples([])
    setIsMonitoring(true)
    const run = async () => {
      const result = await fetchDomainSample(target)
      if (!result) return
      setDomainSamples((prev) => {
        const a = result.a ?? []
        const aaaa = result.aaaa ?? []
        const next: DomainSample[] = [
          ...prev,
          { index: prev.length, t: Date.now(), a, aaaa, error: result.error },
        ]
        return next.slice(-MAX_DOMAIN_SAMPLES).map((s, i) => ({ ...s, index: i }))
      })
    }
    run()
    intervalRef.current = setInterval(run, DOMAIN_POLL_INTERVAL_MS)
    maxDurationRef.current = setTimeout(stopMonitoring, DOMAIN_MONITORING_MAX_DURATION_MS)
  }, [formik.values.target, fetchDomainSample, stopMonitoring])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current)
    }
  }, [])

  const result = lookupMutation.data?.result
  const checkedBy = lookupMutation.data?.checkedBy ?? []
  const comments = lookupMutation.data?.comments ?? []
  const lastSample = domainSamples.length > 0 ? domainSamples[domainSamples.length - 1] : null

  const sampleChanged = (idx: number): boolean => {
    if (idx >= domainSamples.length - 1) return false
    const cur = domainSamples[idx]
    const prev = domainSamples[idx + 1]
    return (
      !sameSet(cur.a, prev.a) ||
      !sameSet(cur.aaaa, prev.aaaa)
    )
  }

  return (
    <DashboardLayout>
      <Head title="Domain Intelligence" />
      <div className="space-y-6">
        <PageHeader
          title="Domain Intelligence"
          description="WHOIS, DNS records, and domain reputation. Use Lookup for one-shot or Start monitoring to watch DNS resolution over time."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Lookup domain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={formik.handleSubmit} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="domain-target">Domain</Label>
                <Input
                  id="domain-target"
                  type="text"
                  placeholder="e.g. example.com"
                  {...formik.getFieldProps('target')}
                  disabled={isMonitoring}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={lookupMutation.isPending || isMonitoring}>
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Lookup'
                  )}
                </Button>
                {!isMonitoring ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={startMonitoring}
                    disabled={!formik.values.target.trim()}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start monitoring
                  </Button>
                ) : (
                  <Button type="button" variant="destructive" onClick={stopMonitoring}>
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            </form>

            {/* One-shot result */}
            {result && domainSamples.length === 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                {result.error ? (
                  <p className="text-destructive">{result.error}</p>
                ) : (
                  <>
                    <p><span className="font-medium">Domain:</span> {result.domain}</p>
                    {result.a?.length ? <p><span className="font-medium">A:</span> {result.a.join(', ')}</p> : null}
                    {result.aaaa?.length ? <p><span className="font-medium">AAAA:</span> {result.aaaa.join(', ')}</p> : null}
                    {result.mx?.length ? (
                      <p><span className="font-medium">MX:</span> {result.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ')}</p>
                    ) : null}
                    {result.ns?.length ? <p><span className="font-medium">NS:</span> {result.ns.join(', ')}</p> : null}
                    {result.whois && Object.keys(result.whois).length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        <p className="font-medium">WHOIS</p>
                        {result.whois.registrar && <p><span className="font-medium">Registrar:</span> {result.whois.registrar}</p>}
                        {result.whois.created && <p><span className="font-medium">Created:</span> {result.whois.created}</p>}
                        {result.whois.expires && <p><span className="font-medium">Expires:</span> {result.whois.expires}</p>}
                        {result.whois.updated && <p><span className="font-medium">Updated:</span> {result.whois.updated}</p>}
                        {result.whois.nameServers?.length ? <p><span className="font-medium">Name servers:</span> {result.whois.nameServers.join(', ')}</p> : null}
                      </div>
                    )}
                    {result.subdomainsFromCt && result.subdomainsFromCt.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium">Subdomains (Certificate Transparency)</p>
                        <ul className="list-disc list-inside mt-1 text-muted-foreground max-h-40 overflow-y-auto">
                          {result.subdomainsFromCt.slice(0, 100).map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        {result.subdomainsFromCt.length > 100 && (
                          <p className="text-xs text-muted-foreground mt-1">+ {result.subdomainsFromCt.length - 100} more</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Resolution history: show while monitoring and persist after stop */}
            {(isMonitoring || domainSamples.length > 0) && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isMonitoring ? 'Latest resolution (live)' : 'Last resolution (stopped)'}
                  </p>
                  {lastSample && (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">A:</span> {lastSample.a.length ? lastSample.a.join(', ') : '—'}</p>
                      <p><span className="font-medium">AAAA:</span> {lastSample.aaaa.length ? lastSample.aaaa.join(', ') : '—'}</p>
                      {lastSample.error && <p className="text-destructive">{lastSample.error}</p>}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Resolution history</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-4">A records</th>
                          <th className="py-2">AAAA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...domainSamples].reverse().map((s, revIdx) => {
                          const idx = domainSamples.length - 1 - revIdx
                          const changed = sampleChanged(idx)
                          return (
                            <tr
                              key={s.index}
                              className={`border-b last:border-0 ${changed ? 'bg-amber-500/10' : ''}`}
                            >
                              <td className="py-2 pr-4 whitespace-nowrap">
                                {new Date(s.t).toLocaleTimeString()}
                                {changed && (
                                  <span className="ml-1 text-xs text-amber-600">(changed)</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 break-all max-w-[240px]">
                                {s.a.length ? s.a.join(', ') : '—'}
                              </td>
                              <td className="py-2 break-all max-w-[240px]">
                                {s.aaaa.length ? s.aaaa.join(', ') : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {checkedBy.length > 0 && domainSamples.length === 0 && (
              <CheckedBy entries={checkedBy} targetLabel="this domain" />
            )}

            {result && domainSamples.length === 0 && (
              <LookupComments
                type="domain"
                target={result.domain}
                targetLabel="this domain"
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
