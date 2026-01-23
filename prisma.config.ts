import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use DIRECT_URL for Prisma CLI operations (migrations, db pull, etc.)
    // This ensures CLI talks directly to Supabase, not through the pooler
    url: env('DIRECT_URL'),
  },
})
