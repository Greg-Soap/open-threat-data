import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'team_invitations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('invited_user_role')
      table.dropColumn('admin_pages')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('invited_user_role')
        .notNullable()
        .defaultTo('normal_user')
        .index()
      table.text('admin_pages').nullable()
    })
  }
}
