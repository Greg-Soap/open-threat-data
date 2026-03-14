import { Head } from '@inertiajs/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFormik } from 'formik'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Column } from '#types/extra'
import type { RawTeam } from '#types/model-types'
import { DataTable } from '@/components/dashboard/data-table'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type ServerErrorResponse, serverErrorResponder } from '@/lib/error'
import api from '@/lib/http'

interface TeamMemberRow {
  id: string
  fullName: string | null
  email: string | null
  role: string
  createdAt: string
}



const memberColumns: Column<TeamMemberRow>[] = [
  { key: 'fullName', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    cell: (row) => <span className='capitalize'>{row.role}</span>,
  },
  {
    key: 'createdAt',
    header: 'Joined',
    sortable: true,
    cell: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'),
  },
]

export default function TeamsIndex() {
  const queryClient = useQueryClient()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [membersPage, setMembersPage] = useState(1)
  const [membersPerPage, setMembersPerPage] = useState(10)
  const [membersSearch, setMembersSearch] = useState('')

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get<{ data: { teams: RawTeam[] } }>('/teams')
      return res.data.data.teams
    },
  })

  const teams = teamsQuery.data ?? []
  const hasTeams = teams.length > 0

  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) ?? null
  }, [teams, selectedTeamId])

  useEffect(() => {
    if (selectedTeamId) return
    if (!teams.length) return
    setSelectedTeamId(teams[0].id)
  }, [teams, selectedTeamId])

  useEffect(() => {
    // Reset list state when switching teams
    setMembersPage(1)
    setMembersSearch('')
  }, [selectedTeamId])

  const membersQuery = useQuery({
    queryKey: ['team-members', selectedTeamId, membersPage, membersPerPage, membersSearch],
    enabled: Boolean(selectedTeamId),
    queryFn: async () => {
      const res = await api.get<{
        data: {
          members: TeamMemberRow[]
          meta: { currentPage: number; perPage: number; total: number; lastPage: number }
        }
      }>(`/teams/${selectedTeamId}/members`, {
        params: {
          page: membersPage,
          perPage: membersPerPage,
          search: membersSearch || undefined,
        },
      })
      return res.data.data
    },
  })

  const memberRows = useMemo<TeamMemberRow[]>(() => {
    return (membersQuery.data?.members ?? []).map((m) => ({
      ...m,
      fullName: m.fullName || '—',
      email: m.email || '—',
      role: m.role || 'member',
      createdAt: m.createdAt || '',
    }))
  }, [membersQuery.data?.members])



  const createTeamMutation = useMutation({
    mutationFn: async (values: { name: string }) => {
      const res = await api.post<{ data: { team: RawTeam } }>('/teams', values)
      return res.data.data.team
    },
    onSuccess: async (team) => {
      toast.success('Team created')
      await queryClient.invalidateQueries({ queryKey: ['teams'] })
      createTeamFormik.resetForm()
      setSelectedTeamId(team.id)
      setCreateTeamOpen(false)
    },
    onError: (err: ServerErrorResponse) => {
      toast.error(serverErrorResponder(err) || 'Failed to create team')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (payload: { teamId: string; email: string }) =>
      api.post(`/teams/${payload.teamId}/invitations`, { email: payload.email }),
    onSuccess: () => {
      toast.success('Invite sent')
    },
    onError: (err: ServerErrorResponse) => {
      toast.error(serverErrorResponder(err) || 'Failed to send invite')
    },
  })

  const createTeamFormik = useFormik<{ name: string }>({
    initialValues: { name: '' },
    onSubmit: (values) => createTeamMutation.mutate(values),
  })

  return (
    <DashboardLayout>
      <Head title='Teams' />
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Teams</h1>
            <p className='text-muted-foreground'>Create a team and invite people to join</p>
          </div>
          {hasTeams && (
            <Dialog
              open={createTeamOpen}
              onOpenChange={(open) => {
                setCreateTeamOpen(open)
                if (!open) createTeamFormik.resetForm()
              }}>
              <DialogTrigger className={buttonVariants({ variant: 'default', size: 'default' })}>
                <Plus className='h-4 w-4' />
                Create team
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a team</DialogTitle>
                  <DialogDescription>
                    Teams let you collaborate with others inside the platform.
                  </DialogDescription>
                </DialogHeader>
                <div className='pt-2'>
                  <form onSubmit={createTeamFormik.handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='teamName'>Team name</Label>
                      <Input
                        id='teamName'
                        name='name'
                        value={createTeamFormik.values.name}
                        onChange={createTeamFormik.handleChange}
                        onBlur={createTeamFormik.handleBlur}
                        placeholder='Acme Inc.'
                        required
                      />
                    </div>

                    <Button
                      type='submit'
                      className='w-full'
                      isLoading={createTeamMutation.isPending}
                      loadingText='Creating…'>
                      Create team
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {!hasTeams && (
          <Card>
            <CardHeader>
              <CardTitle>Create a team</CardTitle>
              <CardDescription>
                Teams let you collaborate with others inside the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTeamFormik.handleSubmit} className='space-y-4 max-w-md'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Team name</Label>
                  <Input
                    id='name'
                    name='name'
                    value={createTeamFormik.values.name}
                    onChange={createTeamFormik.handleChange}
                    onBlur={createTeamFormik.handleBlur}
                    placeholder='Acme Inc.'
                    required
                  />
                </div>

                <Button type='submit' isLoading={createTeamMutation.isPending} loadingText='Creating…'>
                  Create team
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            {hasTeams ? <CardDescription>Select a team and invite members.</CardDescription> : null}
          </CardHeader>
          <CardContent>
            {teamsQuery.isLoading ? (
              <div className='text-sm text-muted-foreground'>Loading teams…</div>
            ) : teamsQuery.isError ? (
              <Alert variant='destructive'>
                <AlertDescription>Failed to load teams.</AlertDescription>
              </Alert>
            ) : teams.length ? (
              <div className='space-y-6'>
                <div className='space-y-2'>
                  <Label>Team</Label>
                  <Select
                    itemToStringLabel={(teamId) => teams.find((t) => t.id === teamId)?.name ?? teamId}
                    value={selectedTeamId}
                    onValueChange={(value) => setSelectedTeamId(value ?? '')}>
                    <SelectTrigger className='w-[220px] p-2' size='default'>
                      <SelectValue placeholder='Select a team' />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeam && (
                  <div className='space-y-3 border-t border-border pt-4'>
                    <div className='space-y-1'>
                      <div className='text-sm font-medium'>Invite members</div>
                      <div className='text-sm text-muted-foreground'>
                        Invite someone to join {selectedTeam.name}.
                      </div>
                    </div>

                    <form
                      className='flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2 max-w-xl'
                      onSubmit={(e) => {
                        e.preventDefault()
                        const fd = new FormData(e.currentTarget)
                        const email = String(fd.get('email') || '').trim()
                        if (!email) return
                        inviteMutation.mutate({ teamId: selectedTeam.id, email })
                        e.currentTarget.reset()
                      }}>
                      <div className='flex-1 space-y-2'>
                        <Label htmlFor='invite-email'>Invite by email</Label>
                        <Input
                          id='invite-email'
                          name='email'
                          type='email'
                          placeholder='teammate@company.com'
                          required
                        />
                      </div>
                      <Button type='submit' isLoading={inviteMutation.isPending} loadingText='Sending…'>
                        Send invite
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className='text-sm text-muted-foreground'>
                You don&apos;t have any teams yet. Create one above to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTeam && (
          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
              <CardDescription>Members in {selectedTeam.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              {membersQuery.isError ? (
                <Alert variant='destructive'>
                  <AlertDescription>Failed to load team members.</AlertDescription>
                </Alert>
              ) : (
                <DataTable
                  columns={memberColumns}
                  data={memberRows}
                  searchable
                  searchPlaceholder='Search team members...'
                  searchValue={membersSearch}
                  onSearchChange={(value) => {
                    setMembersSearch(value)
                    setMembersPage(1)
                  }}
                  pagination={
                    membersQuery.data?.meta
                      ? {
                        page: membersQuery.data.meta.currentPage,
                        pageSize: membersQuery.data.meta.perPage,
                        total: membersQuery.data.meta.total,
                        onPageChange: (p) => setMembersPage(p),
                        onPageSizeChange: (pageSize) => {
                          setMembersPerPage(pageSize)
                          setMembersPage(1)
                        },
                      }
                      : undefined
                  }
                  loading={membersQuery.isFetching}
                  emptyMessage='No members found'
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
