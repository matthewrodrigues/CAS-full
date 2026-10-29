import type { Session } from './auth/sessions'
import type { Db } from './db/client'
import type { Game } from './game/engine'
import type { Realtime } from './realtime/rooms'

/** Everything the app reads from the environment, passed in so tests can choose values. */
export type AppConfig = {
  hostPasscode?: string
  staffPasscode?: string
  secureCookies: boolean
  mediaDir: string
}

/** One game and one set of WebSocket rooms per process: there is only ever one server instance. */
export type AppDeps = { db: Db; config: AppConfig; game: Game; realtime: Realtime }

export type AppEnv = { Variables: { session: Session | null } }
