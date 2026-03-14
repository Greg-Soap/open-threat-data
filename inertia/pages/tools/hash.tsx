import { Head } from '@inertiajs/react'
import { useMutation } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Hash, Loader2 } from 'lucide-react'
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

interface HashResult {
  hash: string
  detected: boolean
  detectionCount?: number
  totalEngines?: number
  permalink?: string
  source?: 'virustotal' | 'malwarebazaar'
  malwareBazaar?: { fileName?: string; fileType?: string; firstSeen?: string }
  error?: string
}

export default function ToolHash() {
  const lookupMutation = useMutation({
    mutationFn: async (target: string) => {
      const res = await api.post<{
        result: HashResult
        checkedBy: CheckedByEntry[]
        comments?: CommentEntry[]
      }>('/intel/hash', { target })
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
      <Head title='Hash Analysis' />
      <div className='space-y-6'>
        <PageHeader
          title='Hash Analysis'
          description='File hash reputation and malware detection (VirusTotal, MalwareBazaar).'
        />
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Hash className='h-5 w-5' />
              Lookup hash
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <form onSubmit={formik.handleSubmit} className='flex gap-2'>
              <div className='flex-1 space-y-2'>
                <Label htmlFor='hash-target'>MD5, SHA1, or SHA256</Label>
                <Input
                  id='hash-target'
                  type='text'
                  placeholder='e.g. 44d88612fea8a8f36de82e1278abb02f'
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
                    <p><span className='font-medium'>Hash:</span> {result.hash}</p>
                    <p><span className='font-medium'>Detected:</span> {result.detected ? 'Yes' : 'No'}</p>
                    {result.source && (
                      <p><span className='font-medium'>Source:</span> {result.source}</p>
                    )}
                    {result.detectionCount != null && (
                      <p><span className='font-medium'>Detections:</span> {result.detectionCount} / {result.totalEngines ?? '—'}</p>
                    )}
                    {result.malwareBazaar && (
                      <div className='mt-2 space-y-1 border-t pt-2'>
                        {result.malwareBazaar.fileName && <p><span className='font-medium'>File:</span> {result.malwareBazaar.fileName}</p>}
                        {result.malwareBazaar.fileType && <p><span className='font-medium'>Type:</span> {result.malwareBazaar.fileType}</p>}
                        {result.malwareBazaar.firstSeen && <p><span className='font-medium'>First seen:</span> {result.malwareBazaar.firstSeen}</p>}
                      </div>
                    )}
                    {result.permalink && (
                      <a href={result.permalink} target='_blank' rel='noopener noreferrer' className='text-primary hover:underline text-xs'>
                        View report
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
            {checkedBy.length > 0 && <CheckedBy entries={checkedBy} targetLabel='this hash' />}

            {result && (
              <LookupComments
                type='hash'
                target={result.hash}
                targetLabel='this hash'
                initialComments={comments}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
