import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.dropTableIfExists('blog_post_authors')
    this.schema.dropTableIfExists('blog_post_tags')
    this.schema.dropTableIfExists('blog_posts')
    this.schema.dropTableIfExists('blog_authors')
    this.schema.dropTableIfExists('blog_tags')
    this.schema.dropTableIfExists('blog_categories')
  }

  async down() {
    // Recreating blog tables would require copying structure from original migrations.
    // Not implemented; run the original blog migrations if you need to restore.
  }
}
