import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Globe, Loader2 } from 'lucide-react'
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

export default function ToolIp() {
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: IpResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/ip', { target })
      return res.data
    },
    onError: () => toast.error('Lookup failed'),
  })

  const formik = useFormik<{ target: string }>({
    initialValues: { target: '' },
    onSubmit: (values) => lookupMutation.mutate(values.target),
  })

  const data = lookupMutation.data
  const result = data?.result
  const checkedBy = data?.checkedBy ?? []
  const comments = data?.comments ?? []

  return (
    <DashboardLayout>
      <Head title='IP Intelligence' />
      <div className='space-y-6'>
        <PageHeader
          title='IP Intelligence'
          description='GeoIP, ASN, abuse reports, GreyNoise, and AlienVault OTX.'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Globe className='h-5 w-5' />
              Lookup IP
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='ip-target'>IP address</Label>
                <Input
                  id='ip-target'
                  type='text'
                  placeholder='e.g. 8.8.8.8'
                  {...formik.getFieldProps('target')}
                />
              </div>
              <div className='flex items-end'>
                <Button type='submit' disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    'Lookup'
                  )}
                </Button>
              </div>
            </form>

            {result && (
              <div className='rounded-lg border bg-muted/30 p-4 space-y-2 text-sm'>
                {result.error ? (
                  <p className='text-destructive'>{result.error}</p>
                ) : (
                  <>
                    <p><span className='font-medium'>IP:</span> {result.ip}</p>
                    {result.country != null && (
                      <p><span className='font-medium'>Country:</span> {result.country} ({result.countryCode})</p>
                    )}
                    {result.region != null && <p><span className='font-medium'>Region:</span> {result.region}</p>}
                    {result.city != null && <p><span className='font-medium'>City:</span> {result.city}</p>}
                    {result.isp != null && <p><span className='font-medium'>ISP:</span> {result.isp}</p>}
                    {result.org != null && <p><span className='font-medium'>Org:</span> {result.org}</p>}
                    {result.as != null && <p><span className='font-medium'>AS:</span> {result.as}</p>}
                    {result.abuseScore != null && (
                      <p><span className='font-medium'>Abuse score:</span> {result.abuseScore}</p>
                    )}
                    {result.greyNoise && (
                      <div className='mt-2 pt-2 border-t'>
                        <p className='font-medium'>GreyNoise</p>
                        {result.greyNoise.classification != null && <p><span className='font-medium'>Classification:</span> {result.greyNoise.classification}</p>}
                        {result.greyNoise.name != null && <p><span className='font-medium'>Name:</span> {result.greyNoise.name}</p>}
                        {result.greyNoise.riot != null && <p><span className='font-medium'>RIOT:</span> {result.greyNoise.riot ? 'Yes' : 'No'}</p>}
                        {result.greyNoise.noise != null && <p><span className='font-medium'>Noise:</span> {result.greyNoise.noise ? 'Yes' : 'No'}</p>}
                        {result.greyNoise.link && (
                          <a href={result.greyNoise.link} target='_blank' rel='noopener noreferrer' className='text-primary hover:underline text-xs'>View in GreyNoise</a>
                        )}
                      </div>
                    )}
                    {result.otx && (result.otx.pulseCount != null || result.otx.reputation != null) && (
                      <div className='mt-2 pt-2 border-t'>
                        <p className='font-medium'>AlienVault OTX</p>
                        {result.otx.pulseCount != null && <p><span className='font-medium'>Pulses:</span> {result.otx.pulseCount}</p>}
                        {result.otx.reputation != null && <p><span className='font-medium'>Reputation:</span> {result.otx.reputation}</p>}
                        {result.otx.pulseNames && result.otx.pulseNames.length > 0 && (
                          <p><span className='font-medium'>Pulse names:</span> {result.otx.pulseNames.join(', ')}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {checkedBy.length > 0 && (
              <CheckedBy entries={checkedBy} targetLabel='this IP' />
            )}

            {result && (
              <LookupComments
                type='ip'
                target={result.ip}
                targetLabel='this IP'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
