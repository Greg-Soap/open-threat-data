import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormik } from 'formik'
import { Gauge, Loader2, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

const POLL_INTERVAL_MS = 1000
const MAX_SAMPLES = 120
const MONITORING_MAX_DURATION_MS = 10_000

interface LatencyResult {
  target: string
  latencyMs: number | null
  statusCode?: number
  error?: string
}

interface Sample {
  index: number
  t: number
  latencyMs: number | null
  statusCode?: number
  error?: string
}

function computeStats(samples: Sample[]) {
  const valid = samples.filter((s) => s.latencyMs != null) as (Sample & { latencyMs: number })[]
  const packetsSent = samples.length
  const packetsReceived = valid.filter(
    (s) => s.statusCode != null && s.statusCode >= 200 && s.statusCode < 300
  ).length
  const values = valid.map((s) => s.latencyMs)
  const min = values.length ? Math.min(...values) : null
  const max = values.length ? Math.max(...values) : null
  const avg =
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  let jitter: number | null = null
  if (valid.length >= 2) {
    const deltas: number[] = []
    for (let i = 1; i < valid.length; i++) {
      const a = valid[i - 1].latencyMs
      const b = valid[i].latencyMs
      deltas.push(Math.abs(b - a))
    }
    jitter = deltas.reduce((s, d) => s + d, 0) / deltas.length
  }
  return { packetsSent, packetsReceived, min, max, avg, jitter }
}

export default function ToolLatency() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: LatencyResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/latency', { target })
      return res.data
    },
    onError: () => toast.error('Measurement failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const fetchSample = useCallback(async (target: string) => {
    try {
      const res = await api.get<{ result: LatencyResult }>(
        `/intel/latency/sample?target=${encodeURIComponent(target)}`
      )
      return res.data.result
    } catch {
      return { target, latencyMs: null, error: 'Request failed' }
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
      toast.error('Enter a host or URL')
      return
    }
    setSamples([])
    setIsMonitoring(true)
    const run = async () => {
      const result = await fetchSample(target)
      setSamples((prev) => {
        const next: Sample[] = [
          ...prev,
          {
            index: prev.length,
            t: Date.now(),
            latencyMs: result.latencyMs,
            statusCode: result.statusCode,
            error: result.error,
          },
        ]
        return next.slice(-MAX_SAMPLES).map((s, i) => ({ ...s, index: i }))
      })
    }
    run()
    intervalRef.current = setInterval(run, POLL_INTERVAL_MS)
    maxDurationRef.current = setTimeout(stopMonitoring, MONITORING_MAX_DURATION_MS)
  }, [formik.values.target, fetchSample, stopMonitoring])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current)
    }
  }, [])

  const result = lookupMutation.data?.result
  const checkedBy = lookupMutation.data?.checkedBy ?? []
  const comments = lookupMutation.data?.comments ?? []
  const stats = computeStats(samples)
  const lastSample = samples.length > 0 ? samples[samples.length - 1] : null
  const chartData = samples.map((s) => ({
    index: s.index,
    ms: s.latencyMs ?? 0,
    time: new Date(s.t).toLocaleTimeString(),
  }))

  return (
    <DashboardLayout>
      <Head title="Latency Monitor" />
      <div className="space-y-6">
        <PageHeader
          title="Latency Monitor"
          description="Measure RTT to a host or URL. Use one-shot Measure or Start monitoring for a live graph and packet stats."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Check latency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={formik.handleSubmit}
              className="flex flex-wrap items-end gap-2"
            >
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="latency-target">Host or URL</Label>
                <Input
                  id="latency-target"
                  type="text"
                  placeholder="e.g. google.com or https://example.com"
                  {...formik.getFieldProps('target')}
                  disabled={isMonitoring}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={lookupMutation.isPending || isMonitoring}
                >
                  {lookupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Measure'
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
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={stopMonitoring}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            </form>

            {/* One-shot result */}
            {result && !isMonitoring && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                {result.error ? (
                  <p className="text-destructive">{result.error}</p>
                ) : (
                  <>
                    <p>
                      <span className="font-medium">Target:</span> {result.target}
                    </p>
                    <p>
                      <span className="font-medium">Latency:</span>{' '}
                      {result.latencyMs != null
                        ? `${result.latencyMs} ms`
                        : '—'}
                    </p>
                    {result.statusCode != null && (
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        {result.statusCode}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Live monitoring results: show while monitoring and keep visible after stop */}
            {(isMonitoring || samples.length > 0) && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isMonitoring ? 'Current (live)' : 'Last reading (stopped)'}
                  </p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold tabular-nums">
                      {lastSample?.latencyMs != null
                        ? `${lastSample.latencyMs} ms`
                        : '—'}
                    </span>
                    {lastSample?.statusCode != null && (
                      <span className="text-muted-foreground">
                        HTTP {lastSample.statusCode}
                      </span>
                    )}
                    {lastSample?.error && (
                      <span className="text-destructive text-sm">
                        {lastSample.error}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Packet / sample info</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Sent</p>
                      <p className="font-mono font-medium">{stats.packetsSent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Received</p>
                      <p className="font-mono font-medium">
                        {stats.packetsReceived}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min (ms)</p>
                      <p className="font-mono font-medium">
                        {stats.min != null ? stats.min.toFixed(0) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max (ms)</p>
                      <p className="font-mono font-medium">
                        {stats.max != null ? stats.max.toFixed(0) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg (ms)</p>
                      <p className="font-mono font-medium">
                        {stats.avg != null ? stats.avg.toFixed(1) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jitter (ms)</p>
                      <p className="font-mono font-medium">
                        {stats.jitter != null ? stats.jitter.toFixed(1) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Latency over time</p>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="index"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(i) => (chartData[i]?.time ?? String(i))}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v} ms`}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value} ms`, 'Latency']}
                          labelFormatter={(_, payload) =>
                            Array.isArray(payload) && payload[0]?.payload?.time != null
                              ? String(payload[0].payload.time)
                              : ''
                          }
                        />
                      {stats.avg != null && (
                        <ReferenceLine
                          y={stats.avg}
                          stroke="var(--chart-2)"
                          strokeDasharray="3 3"
                          label={{ value: 'Avg', fontSize: 10 }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="ms"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {checkedBy.length > 0 && !isMonitoring && (
              <CheckedBy entries={checkedBy} targetLabel="this target" />
            )}

            {result && !isMonitoring && (
              <LookupComments
                type="latency"
                target={result.target}
                targetLabel="this target"
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
