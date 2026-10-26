import { createHash, timingSafeEqual } from 'node:crypto'
import type { AppConfig } from '../context'

const digest = (value: string) => createHash('sha256').update(value).digest()

/** Constant-time comparison; hashing first makes both sides the same length. */
function same(input: string, secret: string | undefined): boolean {
  return secret !== undefined && secret !== '' && timingSafeEqual(digest(input), digest(secret))
}

/** The role a passcode unlocks. Staff is checked first because staff can do everything host can. */
export function matchPasscode(input: string, config: AppConfig): 'staff' | 'host' | null {
  if (same(input, config.staffPasscode)) return 'staff'
  if (same(input, config.hostPasscode)) return 'host'
  return null
}
