import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import SuperBaseModel from './super_base.js'
import Team from './team.js'
import User from './user.js'

export type TeamRole = 'owner' | 'admin' | 'member'

export default class TeamMember extends SuperBaseModel {
  static table = 'team_members'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare userId: string

  @column()
  declare role: TeamRole

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}

