import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  // Only used by drizzle-kit commands that connect (e.g. studio); generate works offline.
  dbCredentials: { url: join(process.env.DATA_DIR ?? './data', 'app.db') },
})
