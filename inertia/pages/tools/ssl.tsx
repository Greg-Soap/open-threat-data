import { Head } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Loader2, Play, Shield, Square } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CheckedBy, type CheckedByEntry } from '@/components/tools/checked-by'
import { LookupComments, type CommentEntry } from '@/components/tools/lookup-comments'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/dashboard/page_header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/http'

const SSL_POLL_INTERVAL_MS = 60_000
const SSL_MONITORING_MAX_DURATION_MS = 600_000
const MAX_SSL_SAMPLES = 10

interface SslResult {
  host: string
  port: number
  valid: boolean
  validFrom?: string
  validTo?: string
  issuer?: string
  subjectAltNames?: string[]
  error?: string
}

interface SslSample {
  index: number
  t: number
  valid: boolean
  validTo?: string
  issuer?: string
  daysUntilExpiry: number | null
  error?: string
}

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function ToolSsl() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [sslSamples, setSslSamples] = useState<SslSample[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: SslResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/ssl', { target })
      return res.data
    },
    onSuccess: () => setSslSamples([]),
    onError: () => toast.error('Inspection failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const fetchSslSample = useCallback(async (target: string): Promise<SslResult | null> => {
    try {
      const res = await api.get<{ result: SslResult }>(
        `/intel/ssl/sample?target=${encodeURIComponent(target)}`
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
      toast.error('Enter a host or host:port')
      return
    }
    setSslSamples([])
    setIsMonitoring(true)
    const run = async () => {
      const result = await fetchSslSample(target)
      if (!result) return
      const days = daysUntil(result.validTo)
      setSslSamples((prev) => {
        const next: SslSample[] = [
          ...prev,
          {
            index: prev.length,
            t: Date.now(),
            valid: result.valid,
            validTo: result.validTo,
            issuer: result.issuer,
            daysUntilExpiry: days,
            error: result.error,
          },
        ]
        return next.slice(-MAX_SSL_SAMPLES).map((s, i) => ({ ...s, index: i }))
      })
    }
    run()
    intervalRef.current = setInterval(run, SSL_POLL_INTERVAL_MS)
    maxDurationRef.current = setTimeout(stopMonitoring, SSL_MONITORING_MAX_DURATION_MS)
  }, [formik.values.target, fetchSslSample, stopMonitoring])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current)
    }
  }, [])

  const result = lookupMutation.data?.result
  const checkedBy = lookupMutation.data?.checkedBy ?? []
  const comments = lookupMutation.data?.comments ?? []
  const lastSample = sslSamples.length > 0 ? sslSamples[sslSamples.length - 1] : null
  const chartData = sslSamples.map((s) => ({
    time: new Date(s.t).toLocaleTimeString(),
    daysUntilExpiry: s.daysUntilExpiry ?? 0,
    valid: s.valid ? 1 : 0,
  }))

  return (
    <DashboardLayout>
      <Head title="SSL Certificate Inspector" />
      <div className="space-y-6">
        <PageHeader
          title="SSL Certificate Inspector"
          description="Analyze SSL/TLS configuration, validity, and certificate chain. Use Inspect for one-shot or Start monitoring to watch validity over time."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Inspect certificate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={formik.handleSubmit} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="ssl-target">Host or host:port</Label>
                <Input
                  id="ssl-target"
                  type="text"
                  placeholder="e.g. example.com or example.com:443"
                  {...formik.getFieldProps('target')}
                  disabled={isMonitoring}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={lookupMutation.isPending || isMonitoring}>
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Inspect'
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
            {result && sslSamples.length === 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                {result.error ? (
                  <p className="text-destructive">{result.error}</p>
                ) : (
                  <>
                    <p><span className="font-medium">Host:Port:</span> {result.host}:{result.port}</p>
                    <p><span className="font-medium">Valid:</span> {result.valid ? 'Yes' : 'No'}</p>
                    {result.validFrom && <p><span className="font-medium">Valid from:</span> {result.validFrom}</p>}
                    {result.validTo && <p><span className="font-medium">Valid to:</span> {result.validTo}</p>}
                    {result.issuer && <p><span className="font-medium">Issuer:</span> {result.issuer}</p>}
                    {result.subjectAltNames?.length ? (
                      <p><span className="font-medium">SANs:</span> {result.subjectAltNames.join(', ')}</p>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {/* Monitoring: latest + history + chart */}
            {(isMonitoring || sslSamples.length > 0) && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isMonitoring ? 'Latest sample (live)' : 'Last sample (stopped)'}
                  </p>
                  {lastSample && (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Valid:</span> {lastSample.valid ? 'Yes' : 'No'}</p>
                      {lastSample.validTo && (
                        <p><span className="font-medium">Valid to:</span> {lastSample.validTo}</p>
                      )}
                      {lastSample.daysUntilExpiry != null && (
                        <p><span className="font-medium">Days until expiry:</span> {lastSample.daysUntilExpiry}</p>
                      )}
                      {lastSample.issuer && (
                        <p><span className="font-medium">Issuer:</span> {lastSample.issuer}</p>
                      )}
                      {lastSample.error && (
                        <p className="text-destructive">{lastSample.error}</p>
                      )}
                    </div>
                  )}
                </div>
                {chartData.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-2">Days until expiry over time</p>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="daysUntilExpiry" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Certificate history</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-2">Valid</th>
                          <th className="py-2 pr-2">Valid to</th>
                          <th className="py-2 pr-2">Days to expiry</th>
                          <th className="py-2">Issuer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...sslSamples].reverse().map((s) => (
                          <tr key={s.index} className="border-b last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {new Date(s.t).toLocaleTimeString()}
                            </td>
                            <td className="py-2 pr-2">{s.valid ? 'Yes' : 'No'}</td>
                            <td className="py-2 pr-2">{s.validTo ?? '—'}</td>
                            <td className="py-2 pr-2">{s.daysUntilExpiry ?? '—'}</td>
                            <td className="py-2 truncate max-w-[180px]" title={s.issuer}>
                              {s.issuer ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {checkedBy.length > 0 && sslSamples.length === 0 && (
              <CheckedBy entries={checkedBy} targetLabel="this host" />
            )}

            {result && sslSamples.length === 0 && (
              <LookupComments
                type="ssl"
                target={`${result.host}:${result.port}`}
                targetLabel="this host"
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
