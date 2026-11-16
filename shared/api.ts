import { z } from 'zod'
import { ANIMAL_AVATARS, HOST_CHOICES } from './characters'
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

/** Staff or the host pick a round's host, until its first question opens. */
export const SetRoundHostInput = z.object({ event_id: id, round_id: id, host_choice: z.enum(HOST_CHOICES) })

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

/** A host approves or rejects a team name (section 3); rejected teams keep playing, unnamed. */
export const HostReviewTeamNameInput = z.object({ team_id: id, name_status: z.enum(['approved', 'rejected']) })

export const RedeemCodeInput = z.object({ code: z.string().trim().toUpperCase().min(10).max(32) })

export const SubmitFeedbackInput = z.object({ event_id: id, rating: z.int().min(1).max(5), comment: z.string().trim().max(1000).optional() })

/** Consent is an explicit, unticked-by-default checkbox (SPEC section 8, Milestone 6). */
export const NewsletterOptinInput = z.object({
  email: z.email().max(200),
  topics: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  consent: z.literal(true),
})

// Animal naming prizes and the My Animal feed.
const animalName = z.string().trim().min(1).max(30)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null)

export const AnimalIdInput = z.object({ animal_id: id })
export const ProposeAnimalNameInput = z.object({ right_id: id, name: animalName })
export const FollowAnimalInput = z.object({ animal_id: id, follow: z.boolean() })
export const StaffCreateAnimalInput = z.object({
  species: z.string().trim().min(1).max(60),
  scientific_name: optionalText(80),
  exhibit: z.string().trim().min(1).max(80),
  about: optionalText(500),
  avatar: z.enum(ANIMAL_AVATARS).default('mystery'),
})
/** Puts an animal up as the prize for `place` at an event; `animal_id: null` clears that place. */
export const StaffSetNamingPrizeInput = z.object({ event_id: id, place: z.int().min(1).max(10), animal_id: id.nullable() })
export const StaffReviewAnimalNameInput = z.object({ right_id: id, status: z.enum(['approved', 'rejected']) })
export const StaffPostAnimalUpdateInput = z.object({ animal_id: id, body: z.string().trim().min(1).max(500) })

export const StaffUpdateSettingsInput =z.object({ event_id: id, settings: z.record(z.string(), z.unknown()) })
export const EmptyInput = z.strictObject({})
