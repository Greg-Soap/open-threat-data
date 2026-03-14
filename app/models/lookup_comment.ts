import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { LookupType } from './lookup_history.js'
import User from './user.js'

export default class LookupComment extends BaseModel {
  static table = 'lookup_comments'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: LookupType

  @column()
  declare target: string

  @column()
  declare userId: string

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
