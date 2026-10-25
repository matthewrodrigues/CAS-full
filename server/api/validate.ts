import { zValidator } from '@hono/zod-validator'
import type { ZodType } from 'zod'

// Tagged like the guards, so a test can prove every POST route validates its body with zod.
const VALIDATOR = Symbol('validator')

/** zod validation with one JSON error shape for every route. */
export function validate<Target extends 'json' | 'query', T extends ZodType>(target: Target, schema: T) {
  const middleware = zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }))
      return c.json({ error: 'invalid_input', issues }, 400)
    }
  })
  return Object.assign(middleware, { [VALIDATOR]: true })
}

export function isValidator(handler: unknown): boolean {
  return typeof handler === 'function' && VALIDATOR in handler
}
