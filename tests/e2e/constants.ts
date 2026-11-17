/** Shared by playwright.config.ts (the e2e server's env) and the specs. Test-only values. */
export const E2E_HOST_PASSCODE = 'e2e-host-passcode'
export const E2E_STAFF_PASSCODE = 'e2e-staff-passcode'

/** One seeded event per spec file (scripts/e2e-prepare.ts seeds the same list). */
export const JOIN_CODES = {
  smoke: 'DEMO1',
  // The demo quickstart (demo.spec.ts) needs DEMO1 itself: only DEMO1 has the Demo card.
  demo: 'DEMO1',
  join: 'E2EA1',
  questions: 'E2EB1',
  results: 'E2EC1',
  playThree: 'E2ED1',
  captainOnly: 'E2EF1',
  host: 'E2EG1',
  rewards: 'E2EH1',
  screens: 'E2ES1',
  screensStressTeams: 'E2ET1',
  screensStressLobby: 'E2EU1',
  nudge: 'E2E8A',
  sheetStress: 'E2E8B',
  sheetRounds: 'E2E8C',
  bigScreen: 'E2E10',
  bigScreenHost: 'E2E11',
  roundHostsStaff: 'E11A1',
  roundHostsConsole: 'E11B1',
  roundHostsStarted: 'E11C1',
  afterGame: 'E2E9A',
} as const
