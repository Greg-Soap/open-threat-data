import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Loader2, Server } from 'lucide-react'
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

export default function ToolDomain() {
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: DomainResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/domain', { target })
      return res.data
    },
    onError: () => toast.error('Lookup failed'),
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
      <Head title='Domain Intelligence' />
      <div className='space-y-6'>
        <PageHeader
          title='Domain Intelligence'
          description='WHOIS, DNS records, and domain reputation.'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Server className='h-5 w-5' />
              Lookup domain
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='domain-target'>Domain</Label>
                <Input
                  id='domain-target'
                  type='text'
                  placeholder='e.g. example.com'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Lookup'}
                </Button>
              </div>
            </form>
            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error ? (
                  <p className='text-destructive'>{result.error}</p>
                ) : (
                  <>
                    <p><span className='font-medium'>Domain:</span> {result.domain}</p>
                    {result.a?.length ? <p><span className='font-medium'>A:</span> {result.a.join(', ')}</p> : null}
                    {result.aaaa?.length ? <p><span className='font-medium'>AAAA:</span> {result.aaaa.join(', ')}</p> : null}
                    {result.mx?.length ? (
                      <p><span className='font-medium'>MX:</span> {result.mx.map((m) => `${m.exchange} (${m.priority})`).join(', ')}</p>
                    ) : null}
                    {result.ns?.length ? <p><span className='font-medium'>NS:</span> {result.ns.join(', ')}</p> : null}
                    {result.whois && Object.keys(result.whois).length > 0 && (
                      <div className='mt-3 pt-3 border-t space-y-1'>
                        <p className='font-medium'>WHOIS</p>
                        {result.whois.registrar && <p><span className='font-medium'>Registrar:</span> {result.whois.registrar}</p>}
                        {result.whois.created && <p><span className='font-medium'>Created:</span> {result.whois.created}</p>}
                        {result.whois.expires && <p><span className='font-medium'>Expires:</span> {result.whois.expires}</p>}
                        {result.whois.updated && <p><span className='font-medium'>Updated:</span> {result.whois.updated}</p>}
                        {result.whois.nameServers?.length ? <p><span className='font-medium'>Name servers:</span> {result.whois.nameServers.join(', ')}</p> : null}
                      </div>
                    )}
                    {result.subdomainsFromCt && result.subdomainsFromCt.length > 0 && (
                      <div className='mt-3 pt-3 border-t'>
                        <p className='font-medium'>Subdomains (Certificate Transparency)</p>
                        <ul className='list-disc list-inside mt-1 text-muted-foreground max-h-40 overflow-y-auto'>
                          {result.subdomainsFromCt.slice(0, 100).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                        {result.subdomainsFromCt.length > 100 && (
                          <p className='text-xs text-muted-foreground mt-1'>+ {result.subdomainsFromCt.length - 100} more</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this domain' />}

            {result && (
              <LookupComments
                type='domain'
                target={result.domain}
                targetLabel='this domain'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
