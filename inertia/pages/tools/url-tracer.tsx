import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Link as LinkIcon, Loader2, Shield, ShieldAlert } from 'lucide-react'
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

export default function ToolUrlTracer() {
  const [lookupTarget, setLookupTarget] = useState('')
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: UrlTracerResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/url-tracer', { target })
      return res.data
    },
    onSuccess: (_, target) => setLookupTarget(target ?? ''),
    onError: () => toast.error('Trace failed'),
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
      <Head title='Deep Link Tracer' />
      <div className='space-y-6'>
        <PageHeader
          title='Deep Link Tracer'
          description='Unshorten URLs, analyze redirect chains, and check for malware or phishing.'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <LinkIcon className='h-5 w-5' />
              Trace URL
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='url-target'>URL</Label>
                <Input
                  id='url-target'
                  type='text'
                  placeholder='e.g. https://bit.ly/xxx or https://example.com'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Trace'}
                </Button>
              </div>
            </form>
            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error && <p className='text-destructive'>{result.error}</p>}
                <p><span className='font-medium'>Initial:</span> {result.initialUrl}</p>
                <p><span className='font-medium'>Final:</span> {result.finalUrl}</p>
                <p><span className='font-medium'>Redirects:</span> {result.chainLength}</p>
                {result.steps?.length ? (
                  <ul className='mt-2 space-y-1 list-disc list-inside'>
                    {result.steps.map((s, i) => (
                      <li key={i}>
                        {s.statusCode != null ? `[${s.statusCode}] ` : ''}{s.url}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
            {result?.threatCheck != null && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                <p className='font-medium flex items-center gap-2'>
                  {result.threatCheck.safe ? (
                    <>
                      <Shield className='h-4 w-4 text-green-600' />
                      Threat check: No threats ({result.threatCheck.source})
                    </>
                  ) : (
                    <>
                      <ShieldAlert className='h-4 w-4 text-destructive' />
                      Threat check: Threats detected ({result.threatCheck.source})
                    </>
                  )}
                </p>
                {!result.threatCheck.safe && result.threatCheck.threats.length > 0 && (
                  <ul className='list-disc list-inside text-destructive'>
                    {result.threatCheck.threats.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
                {result.threatCheck.urlhausReference && (
                  <a
                    href={result.threatCheck.urlhausReference}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary hover:underline text-xs'
                  >
                    View URLhaus report
                  </a>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this URL' />}

            {result && lookupTarget && (
              <LookupComments
                type='url'
                target={lookupTarget}
                targetLabel='this URL'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
