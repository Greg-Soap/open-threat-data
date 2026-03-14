import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const databaseUrl = env.get('DATABASE_URL')

const dbConfig = defineConfig({
  connection: databaseUrl ? 'postgres' : 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: app.tmpPath('db.sqlite3'),
      },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    ...(databaseUrl
      ? {
          postgres: {
            client: 'pg' as const,
            connection: databaseUrl,
            migrations: {
              naturalSort: true,
              paths: ['database/migrations'],
            },
          },
        }
      : {}),
  },
})

export default dbConfig
