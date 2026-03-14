import { formatDistanceToNow } from 'date-fns'
import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CheckedByEntry {
  userId: string
  userName: string | null
  userEmail: string
  at: string
}

interface CheckedByProps {
  entries: CheckedByEntry[]
  targetLabel?: string
}

export function CheckedBy({ entries, targetLabel = 'This' }: CheckedByProps) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <User className='h-4 w-4' />
          Who checked {targetLabel.toLowerCase()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className='space-y-1.5 text-sm text-muted-foreground'>
          {entries.map((e) => (
            <li key={`${e.userId}-${e.at}`} className='flex items-center justify-between gap-2'>
              <span>
                <span className='font-medium text-foreground'>{e.userName || e.userEmail}</span>
                {e.userName && (
                  <span className='ml-1 text-muted-foreground'>({e.userEmail})</span>
                )}
              </span>
              <span className='shrink-0'>
                {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
