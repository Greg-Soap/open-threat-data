import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Loader2, Mail } from 'lucide-react'
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

interface EmailResult {
  input: string
  validFormat: boolean
  domain?: string
  mx?: { exchange: string; priority: number }[]
  mxResolved: boolean
  breached?: boolean
  breachCount?: number
  breaches?: string[]
  error?: string
}

export default function ToolEmail() {
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: EmailResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/email', { target })
      return res.data
    },
    onError: () => toast.error('Check failed'),
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
      <Head title='Email Reputation' />
      <div className='space-y-6'>
        <PageHeader
          title='Email Reputation'
          description='Verify deliverability, MX records, and breach status (Have I Been Pwned).'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='h-5 w-5' />
              Check email
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='email-target'>Email address</Label>
                <Input
                  id='email-target'
                  type='text'
                  placeholder='e.g. user@example.com'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Check'}
                </Button>
              </div>
            </form>
            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error ? (
                  <p className='text-destructive'>{result.error}</p>
                ) : (
                  <>
                    <p><span className='font-medium'>Format valid:</span> {result.validFormat ? 'Yes' : 'No'}</p>
                    {result.domain && <p><span className='font-medium'>Domain:</span> {result.domain}</p>}
                    <p><span className='font-medium'>MX resolved:</span> {result.mxResolved ? 'Yes' : 'No'}</p>
                    {result.mx?.length ? (
                      <p><span className='font-medium'>MX:</span> {result.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ')}</p>
                    ) : null}
                    {result.breached != null && (
                      <div className='mt-2 pt-2 border-t'>
                        <p><span className='font-medium'>Breach check (HIBP):</span> {result.breached ? `Yes — ${result.breachCount ?? 0} breach(es)` : 'No breaches found'}</p>
                        {result.breached && result.breaches && result.breaches.length > 0 && (
                          <ul className='list-disc list-inside mt-1 text-destructive'>
                            {result.breaches.slice(0, 20).map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                            {(result.breaches?.length ?? 0) > 20 && (
                              <li className='text-muted-foreground'>+ {(result.breaches?.length ?? 0) - 20} more</li>
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this email' />}

            {result && (
              <LookupComments
                type='email'
                target={result.input}
                targetLabel='this email'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
