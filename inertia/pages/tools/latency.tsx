import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Gauge, Loader2 } from 'lucide-react'
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

interface LatencyResult {
  target: string
  latencyMs: number | null
  statusCode?: number
  error?: string
}

export default function ToolLatency() {
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

  const result = lookupMutation.data?.result
  const checkedBy = lookupMutation.data?.checkedBy ?? []
  const comments = lookupMutation.data?.comments ?? []

  return (
    <DashboardLayout>
      <Head title='Latency Monitor' />
      <div className='space-y-6'>
        <PageHeader title='Latency Monitor' description='Measure RTT to a host or URL.' />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Gauge className='h-5 w-5' />
              Check latency
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='latency-target'>Host or URL</Label>
                <Input
                  id='latency-target'
                  type='text'
                  placeholder='e.g. google.com or https://example.com'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Measure'}
                </Button>
              </div>
            </form>
            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error ? (
                  <p className='text-destructive'>{result.error}</p>
                ) : (
                  <>
                    <p><span className='font-medium'>Target:</span> {result.target}</p>
                    <p><span className='font-medium'>Latency:</span> {result.latencyMs != null ? `${result.latencyMs} ms` : '—'}</p>
                    {result.statusCode != null && <p><span className='font-medium'>Status:</span> {result.statusCode}</p>}
                  </>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this target' />}

            {result && (
              <LookupComments
                type='latency'
                target={result.target}
                targetLabel='this target'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
