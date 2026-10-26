import type { GameErrorCode } from '../../shared/game'
import type { Db } from '../db/client'
import type { Realtime } from '../realtime/rooms'

/** What every game operation works with. */
export type GameContext = { db: Db; realtime: Realtime }

export type GameResult<T> = { ok: true; value: T } | { ok: false; error: GameErrorCode }

export const ok = <T>(value: T): GameResult<T> => ({ ok: true, value })
export const fail = (error: GameErrorCode): { ok: false; error: GameErrorCode } => ({ ok: false, error })
