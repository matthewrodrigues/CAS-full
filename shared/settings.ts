import { z } from 'zod'

// Per-event settings stored in events.settings. Defaults are the section 2 decisions;
// each one is configurable because the team may change it after testing.
export const EventSettings = z
  .object({
    max_team_size: z.int().min(1).max(20).default(6),
    team_submissions: z.enum(['any_member', 'captain_only']).default('any_member'),
    speed_bonus: z.enum(['off', 'tiered']).default('off'),
    grace_ms: z.int().min(0).max(10_000).default(1200),
    auto_accept_threshold: z.number().min(0).max(1).default(0.8),
    review_threshold: z.number().min(0).max(1).default(0.5),
    live_background: z.enum(['cream', 'violet']).default('cream'),
  })
  .refine((s) => s.review_threshold <= s.auto_accept_threshold, {
    message: 'review_threshold must not exceed auto_accept_threshold',
    path: ['review_threshold'],
  })

export type EventSettings = z.infer<typeof EventSettings>

export function parseSettings(value: unknown): EventSettings {
  return EventSettings.parse(value)
}
