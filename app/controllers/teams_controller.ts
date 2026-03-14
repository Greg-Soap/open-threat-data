import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Team from '#models/team'
import TeamMember from '#models/team_member'
import User from '#models/user'
import { createTeamValidator } from '#validators/team'

export default class TeamsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const freshUser = await User.findByOrFail('email', user.email)

    const teams = await Team.query()
      .whereIn(
        'id',
        TeamMember.query().select('team_id').where('user_id', freshUser.id),
      )
      .where('kind', 'user')
      .orderBy('created_at', 'desc')

    return response.ok({
      data: {
        teams: teams.map((t) => t.serialize()),
      },
    })
  }

  async store({ auth, request, response, now }: HttpContext) {
    const user = auth.getUserOrFail()
    const freshUser = await User.findByOrFail('email', user.email)
    const body = await request.validateUsing(createTeamValidator)

    if (!user.emailVerified) {
      return response.forbidden({ error: 'Please verify your email address before creating a team.' })
    }

    const trx = await db.transaction()

    try {
      const team = await Team.create(
        {
          name: body.name,
          kind: 'user',
          createdByUserId: freshUser.id,
          createdAt: now,
          updatedAt: now,
        },
        { client: trx },
      )

      await TeamMember.create(
        {
          teamId: team.id,
          userId: freshUser.id,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        },
        { client: trx },
      )

      await trx.commit()

      return response.created({
        message: 'Team created successfully',
        data: { team: team.serialize() },
      })
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  async members({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const freshUser = await User.findByOrFail('email', user.email)
    const teamId = request.param('teamId')
    const qs = request.qs()
    const page = Math.max(Number(qs.page ?? 1) || 1, 1)
    const perPage = Math.min(Math.max(Number(qs.perPage ?? 10) || 10, 1), 100)
    const search = typeof qs.search === 'string' ? qs.search.trim() : ''

    const team = await Team.findOrFail(teamId)
    const isMember = await TeamMember.query()
      .where('team_id', teamId)
      .where('user_id', freshUser.id)
      .first()

    if (!isMember) {
      return response.forbidden({ error: 'You do not have access to this team.' })
    }

    const membersQuery = TeamMember.query()
      .where('team_id', teamId)
      .if(search.length > 0, (q) => {
        q.whereHas('user', (uq) => {
          uq.whereILike('email', `%${search}%`).orWhereILike('full_name', `%${search}%`)
        })
      })
      .preload('user')
      .orderBy('created_at', 'asc')

    const paginator = await membersQuery.paginate(page, perPage)
    const members = paginator.all()
    const meta = paginator.getMeta()

    return response.ok({
      data: {
        meta: {
          currentPage: meta.currentPage,
          perPage: meta.perPage,
          total: meta.total,
          lastPage: meta.lastPage,
        },
        members: members.map((m) => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt.toISO() || '',
          fullName: m.user?.fullName || null,
          email: m.user?.email || null,
        })),
      },
    })
  }
}

