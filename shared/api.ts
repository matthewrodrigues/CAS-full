import { z } from 'zod'
import { OVERRIDE_RESULTS } from './enums'

// Input schemas for every API route (docs/SPEC.md section 5). Keys are snake_case, as in the spec.

const id = z.uuid()
const note = z.string().trim().min(1).max(200)

export const LoginInput = z.object({ passcode: z.string().min(1).max(200) })

export const JoinEventInput = z.object({
  // Players type the code from the big screen, so forgive case and stray spaces.
  join_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,5}$/),
  nickname: z.string().trim().min(1).max(24),
})

export const EventIdInput = z.object({ event_id: id })
export const CreateTeamInput = z.object({ event_id: id, name: z.string().trim().min(1).max(30) })
export const JoinTeamInput = z.object({ team_id: id })

/** mc and true_false answer with an option index (true_false: 0 = True, 1 = False). */
export const AnswerInput = z.union([
  z.strictObject({ option: z.int().min(0) }),
  z.strictObject({ text: z.string().max(200) }),
  z.strictObject({ number: z.number() }),
])
export type Answer = z.infer<typeof AnswerInput>

export const SubmitAnswerInput = z.object({ event_question_id: id, answer: AnswerInput, is_draft: z.boolean() })
export const SubmitWagerInput = z.object({ event_question_id: id, amount: z.int().min(0) })

export const HostOverrideInput = z.object({ submission_id: id, result: z.enum(OVERRIDE_RESULTS), note })
export const HostAdjustScoreInput = z.object({
  team_id: id,
  points: z
    .int()
    .min(-1000)
    .max(1000)
    .refine((points) => points !== 0, 'points must not be 0'),
  note,
})

export const RedeemCodeInput = z.object({ code: z.string().trim().min(10).max(32) })
export const EmptyInput = z.strictObject({})
