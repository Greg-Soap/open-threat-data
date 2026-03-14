import { Head } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Globe, Loader2, Play, Square } from 'lucide-react'
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

const IP_POLL_INTERVAL_MS = 45_000
const IP_MONITORING_MAX_DURATION_MS = 300_000
const MAX_IP_SAMPLES = 10

interface GreyNoiseInfo {
  classification?: string
  name?: string
  riot?: boolean
  noise?: boolean
  link?: string
}

interface OtxInfo {
  pulseCount?: number
  pulseNames?: string[]
  reputation?: number
}

interface IpResult {
  ip: string
  country?: string
  countryCode?: string
  region?: string
  city?: string
  isp?: string
  org?: string
  as?: string
  abuseScore?: number
  greyNoise?: GreyNoiseInfo
  otx?: OtxInfo
  error?: string
}

interface IpSample {
  index: number
  t: number
  abuseScore: number | null
  countryCode?: string
  error?: string
}

export default function ToolIp() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [ipSamples, setIpSamples] = useState<IpSample[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: IpResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/ip', { target })
      return res.data
    },
    onSuccess: () => setIpSamples([]),
    onError: () => toast.error('Lookup failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const fetchIpSample = useCallback(async (target: string): Promise<IpResult | null> => {
    try {
      const res = await api.get<{ result: IpResult }>(
        `/intel/ip/sample?target=${encodeURIComponent(target)}`
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
      toast.error('Enter an IP address')
      return
    }
    setIpSamples([])
    setIsMonitoring(true)
    const run = async () => {
      const result = await fetchIpSample(target)
      if (!result) return
      setIpSamples((prev) => {
        const next: IpSample[] = [
          ...prev,
          {
            index: prev.length,
            t: Date.now(),
            abuseScore: result.abuseScore ?? null,
            countryCode: result.countryCode,
            error: result.error,
          },
        ]
        return next.slice(-MAX_IP_SAMPLES).map((s, i) => ({ ...s, index: i }))
      })
    }
    run()
    intervalRef.current = setInterval(run, IP_POLL_INTERVAL_MS)
    maxDurationRef.current = setTimeout(stopMonitoring, IP_MONITORING_MAX_DURATION_MS)
  }, [formik.values.target, fetchIpSample, stopMonitoring])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (maxDurationRef.current) clearTimeout(maxDurationRef.current)
    }
  }, [])

  const data = lookupMutation.data
  const result = data?.result
  const checkedBy = data?.checkedBy ?? []
  const comments = data?.comments ?? []
  const lastSample = ipSamples.length > 0 ? ipSamples[ipSamples.length - 1] : null

  const abuseValues = ipSamples
    .map((s) => s.abuseScore)
    .filter((v): v is number => v != null)
  const minAbuse = abuseValues.length ? Math.min(...abuseValues) : null
  const maxAbuse = abuseValues.length ? Math.max(...abuseValues) : null
  const avgAbuse =
    abuseValues.length
      ? Math.round((abuseValues.reduce((a, b) => a + b, 0) / abuseValues.length) * 10) / 10
      : null

  const chartData = ipSamples.map((s) => ({
    time: new Date(s.t).toLocaleTimeString(),
    abuseScore: s.abuseScore ?? 0,
    country: s.countryCode ?? '—',
  }))

  return (
    <DashboardLayout>
      <Head title="IP Intelligence" />
      <div className="space-y-6">
        <PageHeader
          title="IP Intelligence"
          description="GeoIP, ASN, abuse reports, GreyNoise, and AlienVault OTX. Use Lookup for one-shot or Start monitoring to watch abuse score over time."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Lookup IP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={formik.handleSubmit} className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="ip-target">IP address</Label>
                <Input
                  id="ip-target"
                  type="text"
                  placeholder="e.g. 8.8.8.8"
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
            {result && ipSamples.length === 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                {result.error ? (
                  <p className="text-destructive">{result.error}</p>
                ) : (
                  <>
                    <p><span className="font-medium">IP:</span> {result.ip}</p>
                    {result.country != null && (
                      <p><span className="font-medium">Country:</span> {result.country} ({result.countryCode})</p>
                    )}
                    {result.region != null && <p><span className="font-medium">Region:</span> {result.region}</p>}
                    {result.city != null && <p><span className="font-medium">City:</span> {result.city}</p>}
                    {result.isp != null && <p><span className="font-medium">ISP:</span> {result.isp}</p>}
                    {result.org != null && <p><span className="font-medium">Org:</span> {result.org}</p>}
                    {result.as != null && <p><span className="font-medium">AS:</span> {result.as}</p>}
                    {result.abuseScore != null && (
                      <p><span className="font-medium">Abuse score:</span> {result.abuseScore}</p>
                    )}
                    {result.greyNoise && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium">GreyNoise</p>
                        {result.greyNoise.classification != null && <p><span className="font-medium">Classification:</span> {result.greyNoise.classification}</p>}
                        {result.greyNoise.name != null && <p><span className="font-medium">Name:</span> {result.greyNoise.name}</p>}
                        {result.greyNoise.riot != null && <p><span className="font-medium">RIOT:</span> {result.greyNoise.riot ? 'Yes' : 'No'}</p>}
                        {result.greyNoise.noise != null && <p><span className="font-medium">Noise:</span> {result.greyNoise.noise ? 'Yes' : 'No'}</p>}
                        {result.greyNoise.link && (
                          <a href={result.greyNoise.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View in GreyNoise</a>
                        )}
                      </div>
                    )}
                    {result.otx && (result.otx.pulseCount != null || result.otx.reputation != null) && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium">AlienVault OTX</p>
                        {result.otx.pulseCount != null && <p><span className="font-medium">Pulses:</span> {result.otx.pulseCount}</p>}
                        {result.otx.reputation != null && <p><span className="font-medium">Reputation:</span> {result.otx.reputation}</p>}
                        {result.otx.pulseNames && result.otx.pulseNames.length > 0 && (
                          <p><span className="font-medium">Pulse names:</span> {result.otx.pulseNames.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Monitoring: latest + stats + chart + persist after stop */}
            {(isMonitoring || ipSamples.length > 0) && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isMonitoring ? 'Latest sample (live)' : 'Last sample (stopped)'}
                  </p>
                  {lastSample && (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Abuse score:</span> {lastSample.abuseScore ?? '—'}</p>
                      {lastSample.countryCode && (
                        <p><span className="font-medium">Country:</span> {lastSample.countryCode}</p>
                      )}
                      {lastSample.error && <p className="text-destructive">{lastSample.error}</p>}
                    </div>
                  )}
                </div>
                {(minAbuse != null || maxAbuse != null || avgAbuse != null) && (
                  <div className="rounded-lg border p-4 flex flex-wrap gap-4 text-sm">
                    {minAbuse != null && <span><span className="font-medium">Min abuse:</span> {minAbuse}</span>}
                    {maxAbuse != null && <span><span className="font-medium">Max abuse:</span> {maxAbuse}</span>}
                    {avgAbuse != null && <span><span className="font-medium">Avg abuse:</span> {avgAbuse}</span>}
                  </div>
                )}
                {chartData.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-2">Abuse score over time</p>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="abuseScore" stroke="hsl(var(--primary))" strokeWidth={2} name="Abuse score" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-2">Sample history</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Time</th>
                          <th className="py-2 pr-2">Abuse score</th>
                          <th className="py-2">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...ipSamples].reverse().map((s) => (
                          <tr key={s.index} className="border-b last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {new Date(s.t).toLocaleTimeString()}
                            </td>
                            <td className="py-2 pr-2">{s.abuseScore ?? '—'}</td>
                            <td className="py-2">{s.countryCode ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {checkedBy.length > 0 && ipSamples.length === 0 && (
              <CheckedBy entries={checkedBy} targetLabel="this IP" />
            )}

            {result && ipSamples.length === 0 && (
              <LookupComments
                type="ip"
                target={result.ip}
                targetLabel="this IP"
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
