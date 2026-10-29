/** Shared by playwright.config.ts (the e2e server's env) and the specs. Test-only values. */
export const E2E_HOST_PASSCODE = 'e2e-host-passcode'
export const E2E_STAFF_PASSCODE = 'e2e-staff-passcode'

/** One seeded event per spec file (scripts/e2e-prepare.ts seeds the same list). */
export const JOIN_CODES = {
  smoke: 'DEMO1',
  join: 'E2EA1',
  questions: 'E2EB1',
  results: 'E2EC1',
  playThree: 'E2ED1',
  captainOnly: 'E2EF1',
  host: 'E2EG1',
  rewards: 'E2EH1',
} as const
