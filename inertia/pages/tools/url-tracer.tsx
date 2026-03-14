import { Head } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Link as LinkIcon, Loader2, Play, Shield, ShieldAlert, Square } from 'lucide-react'
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

const TRACE_POLL_INTERVAL_MS = 12_000
const TRACE_MONITORING_MAX_DURATION_MS = 60_000
const MAX_TRACE_SAMPLES = 10

interface UrlThreatCheck {
  safe: boolean
  threats: string[]
  source: 'urlhaus' | 'safebrowsing'
  urlhausReference?: string
  urlhausThreat?: string
  urlhausTags?: string[]
}

interface UrlTracerResult {
  initialUrl: string
  finalUrl: string
  steps: { url: string; statusCode?: number }[]
  chainLength: number
  threatCheck?: UrlThreatCheck | null
  error?: string
}

interface TraceSample {
  index: number
  t: number
  initialUrl: string
  finalUrl: string
  chainLength: number
  threatCheck?: UrlThreatCheck | null
  error?: string
}

export default function ToolUrlTracer() {
  const [lookupTarget, setLookupTarget] = useState('')
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [traceSamples, setTraceSamples] = useState<TraceSample[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: UrlTracerResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/url-tracer', { target })
      return res.data
    },
    onSuccess: (_, target) => {
      setLookupTarget(target ?? '')
      setTraceSamples([])
    },
    onError: () => toast.error('Trace failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const fetchTraceSample = useCallback(async (target: string): Promise<UrlTracerResult | null> => {
    try {
      const res = await api.get<{ result: UrlTracerResult }>(
        `/intel/url-tracer/sample?target=${encodeURIComponent(target)}`
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
      toast.error('Enter a URL')
      return
    }
    setTraceSamples([])
    setIsMonitoring(true)
    const run = async () => {
      const result = await fetchTraceSample(target)
      if (!result) return
      setTraceSamples((prev) => {
        const next: TraceSample[] = [
          ...prev,
          {
            index: prev.length,
            t: Date.now(),
            initialUrl: result.initialUrl,
            finalUrl: result.finalUrl,
            chainLength: result.chainLength,
            threatCheck: result.threatCheck,
            error: result.error,
          },
        ]
        return next.slice(-MAX_TRACE_SAMPLES).map((s, i) => ({ ...s, index: i }))
      })
    }
    run()
    intervalRef.current = setInterval(run, TRACE_POLL_INTERVAL_MS)
    maxDurationRef.current = setTimeout(stopMonitoring, TRACE_MONITORING_MAX_DURATION_MS)
  }, [formik.values.target, fetchTraceSample, stopMonitoring])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current)
    }
  }, [])

  const result = lookupMutation.data?.result
  const checkedBy = lookupMutation.data?.checkedBy ?? []
  const comments = lookupMutation.data?.comments ?? []
  const lastSample = traceSamples.length > 0 ? traceSamples[traceSamples.length - 1] : null

  return (
    <DashboardLayout>
      <Head title="Deep Link Tracer" />
      <div className="space-y-6">
        <PageHeader
          title="Deep Link Tracer"
          description="Unshorten URLs, analyze redirect chains, and check for malware or phishing. Use Trace for one-shot or Start monitoring to watch for changes."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Trace URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={formik.handleSubmit} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="url-target">URL</Label>
                <Input
                  id="url-target"
                  type="text"
                  placeholder="e.g. https://bit.ly/xxx or https://example.com"
                  {...formik.getFieldProps('target')}
                  disabled={isMonitoring}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={lookupMutation.isPending || isMonitoring}>
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Trace'
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

            {/* One-shot result (when not from monitoring) */}
            {result && !isMonitoring && traceSamples.length === 0 && (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  {result.error && <p className="text-destructive">{result.error}</p>}
                  <p><span className="font-medium">Initial:</span> {result.initialUrl}</p>
                  <p><span className="font-medium">Final:</span> {result.finalUrl}</p>
                  <p><span className="font-medium">Redirects:</span> {result.chainLength}</p>
                  {result.steps?.length ? (
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {result.steps.map((s, i) => (
                        <li key={`${s.url}-${i}`}>
                          {s.statusCode != null ? `[${s.statusCode}] ` : ''}{s.url}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {result?.threatCheck != null && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      {result.threatCheck.safe ? (
                        <>
                          <Shield className="h-4 w-4 text-green-600" />
                          Threat check: No threats ({result.threatCheck.source})
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                          Threat check: Threats detected ({result.threatCheck.source})
                        </>
                      )}
                    </p>
                    {!result.threatCheck.safe && result.threatCheck.threats.length > 0 && (
                      <ul className="list-disc list-inside text-destructive">
                        {result.threatCheck.threats.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    )}
                    {result.threatCheck.urlhausReference && (
                      <a
                        href={result.threatCheck.urlhausReference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        View URLhaus report
                      </a>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Trace history: show while monitoring and keep visible after stop */}
            {(isMonitoring || traceSamples.length > 0) && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isMonitoring ? 'Latest trace (live)' : 'Last trace (stopped)'}
                  </p>
                  {lastSample && (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Final URL:</span> {lastSample.finalUrl}</p>
                      <p><span className="font-medium">Redirects:</span> {lastSample.chainLength}</p>
                      {lastSample.threatCheck != null && (
                        <p className="flex items-center gap-2">
                          {lastSample.threatCheck.safe ? (
                            <><Shield className="h-4 w-4 text-green-600" /> No threats</>
                          ) : (
                            <><ShieldAlert className="h-4 w-4 text-destructive" /> Threats detected</>
                          )}
                        </p>
                      )}
                      {lastSample.error && (
                        <p className="text-destructive">{lastSample.error}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Trace history</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-4">Final URL</th>
                          <th className="py-2 pr-2">Redirects</th>
                          <th className="py-2">Threats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...traceSamples].reverse().map((s) => (
                          <tr key={s.index} className="border-b last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {new Date(s.t).toLocaleTimeString()}
                            </td>
                            <td className="py-2 pr-4 break-all max-w-[200px] truncate" title={s.finalUrl}>
                              {s.finalUrl}
                            </td>
                            <td className="py-2 pr-2">{s.chainLength}</td>
                            <td className="py-2">
                              {s.threatCheck != null
                                ? s.threatCheck.safe ? 'No' : 'Yes'
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {checkedBy.length > 0 && !isMonitoring && traceSamples.length === 0 && (
              <CheckedBy entries={checkedBy} targetLabel="this URL" />
            )}

            {result && lookupTarget && !isMonitoring && traceSamples.length === 0 && (
              <LookupComments
                type="url"
                target={lookupTarget}
                targetLabel="this URL"
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
