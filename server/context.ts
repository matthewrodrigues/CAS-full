import type { Session } from './auth/sessions'
import type { Db } from './db/client'

/** Everything the app reads from the environment, passed in so tests can choose values. */
export type AppConfig = {
  hostPasscode?: string
  staffPasscode?: string
  secureCookies: boolean
  mediaDir: string
}

export type AppDeps = { db: Db; config: AppConfig }

export type AppEnv = { Variables: { session: Session | null } }
