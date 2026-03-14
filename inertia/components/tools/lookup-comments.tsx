import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/http'

export type LookupType =
  | 'ip'
  | 'domain'
  | 'hash'
  | 'url'
  | 'email'
  | 'ssl'
  | 'latency'

export interface CommentEntry {
  id: number
  userId: string
  userName: string | null
  body: string
  createdAt: string
}

interface LookupCommentsProps {
  type: LookupType
  target: string
  targetLabel: string
  initialComments: CommentEntry[]
  canComment?: boolean
}

export function LookupComments({
  type,
  target,
  targetLabel,
  initialComments,
  canComment = true,
}: LookupCommentsProps) {
  const [comments, setComments] = useState<CommentEntry[]>(initialComments)

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  const [body, setBody] = useState('')

  const addCommentMutation = useMutation({
    mutationFn: async (commentBody: string) => {
      const res = await api.post<{ comment: CommentEntry }>('/intel/comment', {
        type,
        target,
        body: commentBody,
      })
      return res.data
    },
    onSuccess: (data) => {
      setComments((prev) => [data.comment, ...prev])
      setBody('')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    addCommentMutation.mutate(trimmed)
  }

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <MessageSquare className='h-4 w-4' />
          Comments for this lookup
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {comments.length > 0 ? (
          <ul className='space-y-3 text-sm'>
            {comments.map((c) => (
              <li key={c.id} className='rounded-lg border bg-muted/30 p-3'>
                <div className='flex items-center justify-between gap-2 text-muted-foreground mb-1'>
                  <span className='font-medium text-foreground'>
                    {c.userName ?? 'Anonymous'}
                  </span>
                  <span className='shrink-0'>
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className='text-foreground whitespace-pre-wrap'>{c.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-muted-foreground'>No comments yet. Be the first to add one.</p>
        )}

        {canComment && (
          <form onSubmit={handleSubmit} className='space-y-2'>
            <Textarea
              placeholder={`Add a comment about ${targetLabel}...`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={2000}
              className='resize-none'
            />
            <Button
              type='submit'
              size='sm'
              disabled={addCommentMutation.isPending || !body.trim()}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Add comment'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
