import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lookup_comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('type', 32).notNullable()
      table.text('target').notNullable()
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('body').notNullable()
      table.timestamp('created_at')
      table.index(['type', 'target'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
