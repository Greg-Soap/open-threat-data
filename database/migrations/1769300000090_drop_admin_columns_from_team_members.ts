import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'team_members'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('admin_pages')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('admin_pages').nullable()
    })
  }
}
