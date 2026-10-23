import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// .env is optional: hosts set real environment variables, and the defaults cover local dev and tests.
if (existsSync('.env')) process.loadEnvFile('.env')

// An empty value in .env means "not set".
const optionalSecret = z
  .string()
  .optional()
  .transform((value) => value || undefined)

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATA_DIR: z.string().min(1).default('./data'),
  // Required from Milestone 1, when passcode login exists (docs/SPEC.md section 5).
  HOST_PASSCODE: optionalSecret,
  STAFF_PASSCODE: optionalSecret,
})

const parsed = EnvSchema.parse(process.env)

export const env = { ...parsed, DATA_DIR: resolve(parsed.DATA_DIR) }
