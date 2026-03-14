import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Loader2, Shield } from 'lucide-react'
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

export default function ToolSsl() {
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: SslResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/ssl', { target })
      return res.data
    },
    onError: () => toast.error('Inspection failed'),
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
      <Head title='SSL Certificate Inspector' />
      <div className='space-y-6'>
        <PageHeader
          title='SSL Certificate Inspector'
          description='Analyze SSL/TLS configuration, validity, and certificate chain.'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5' />
              Inspect certificate
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='ssl-target'>Host or host:port</Label>
                <Input
                  id='ssl-target'
                  type='text'
                  placeholder='e.g. example.com or example.com:443'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Inspect'}
                </Button>
              </div>
            </form>
            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error ? (
                  <p className='text-destructive'>{result.error}</p>
                ) : (
                  <>
                    <p><span className='font-medium'>Host:Port:</span> {result.host}:{result.port}</p>
                    <p><span className='font-medium'>Valid:</span> {result.valid ? 'Yes' : 'No'}</p>
                    {result.validFrom && <p><span className='font-medium'>Valid from:</span> {result.validFrom}</p>}
                    {result.validTo && <p><span className='font-medium'>Valid to:</span> {result.validTo}</p>}
                    {result.issuer && <p><span className='font-medium'>Issuer:</span> {result.issuer}</p>}
                    {result.subjectAltNames?.length ? (
                      <p><span className='font-medium'>SANs:</span> {result.subjectAltNames.join(', ')}</p>
                    ) : null}
                  </>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this host' />}

            {result && (
              <LookupComments
                type='ssl'
                target={`${result.host}:${result.port}`}
                targetLabel='this host'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
