import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export type LookupType = 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'ssl' | 'latency'

export default class LookupHistory extends BaseModel {
  static table = 'lookup_history'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare type: LookupType

  @column()
  declare target: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
