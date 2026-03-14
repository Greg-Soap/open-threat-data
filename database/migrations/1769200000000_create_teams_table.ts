import env from '#start/env'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'teams'

  async up() {
    const uuidDefault = env.get('DATABASE_URL')
      ? this.db.rawQuery('gen_random_uuid()').knexQuery
      : this.db.rawQuery('(lower(hex(randomblob(16))))').knexQuery
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(uuidDefault)

      table.string('name').notNullable()
      table.uuid('created_by_user_id').notNullable().index()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.foreign('created_by_user_id').references('id').inTable('users').onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

