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

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATA_DIR: z.string().min(1).default('./data'),
    HOST_PASSCODE: optionalSecret,
    STAFF_PASSCODE: optionalSecret,
  })
  .superRefine((env, ctx) => {
    // In development an unset passcode only disables that role's login, so a clean clone still runs.
    if (env.NODE_ENV === 'production') {
      for (const key of ['HOST_PASSCODE', 'STAFF_PASSCODE'] as const) {
        if ((env[key]?.length ?? 0) < 12) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} must be set to at least 12 characters in production` })
        }
      }
    }
    // Otherwise every host would log in as staff.
    if (env.HOST_PASSCODE && env.HOST_PASSCODE === env.STAFF_PASSCODE) {
      ctx.addIssue({ code: 'custom', path: ['STAFF_PASSCODE'], message: 'HOST_PASSCODE and STAFF_PASSCODE must differ' })
    }
  })

const parsed = EnvSchema.parse(process.env)

export const env = { ...parsed, DATA_DIR: resolve(parsed.DATA_DIR) }
