import { z } from 'zod'

// Input schemas for every API route (docs/SPEC.md section 5). Keys are snake_case, as in the spec.

export const LoginInput = z.object({ passcode: z.string().min(1).max(200) })
