// Prizes (docs/SPEC.md sections 4, 6 rule 7, and 8 Milestone 6). At `ended`, rewards are
// awarded by tier: tier 1 to the team(s) ranked 1, tier 2 to rank 2, and so on, with the last
// tier going to every team. Tiers before the last need points above zero. Every member of a
// winning team gets their own code, within the reward's per-person limit.
import { randomInt, randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq } from 'drizzle-orm'
import type { MyReward, StaffAward } from '../../shared/game'
import type { Db } from '../db/client'
import { eventLeaderboard } from '../db/queries'
import { players, rewardAwards, rewards, teamMembers } from '../db/schema'
import { fail, ok, type GameResult } from './context'

/** No 0/O, 1/I/L: codes are read aloud and typed in by staff (rule 7: unambiguous alphabet). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 10
const DAY_MS = 86_400_000

export const newCode = () => Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

export function awardPrizes(db: Db, eventId: string) {
  const tiers = db.select().from(rewards).orderBy(asc(rewards.tier)).all()
  if (tiers.length === 0) return
  const board = eventLeaderboard(db, eventId)
  const now = Date.now()
  db.transaction((tx) => {
    tiers.forEach((reward, i) => {
      const last = i === tiers.length - 1
      const winners = last ? board : board.filter((row) => row.rank === i + 1 && row.points > 0)
      for (const team of winners) {
        const members = tx.select({ playerId: teamMembers.playerId }).from(teamMembers).where(eq(teamMembers.teamId, team.teamId)).all()
        for (const { playerId } of members) {
          const had = tx.select({ n: count() }).from(rewardAwards).where(and(eq(rewardAwards.rewardId, reward.id), eq(rewardAwards.playerId, playerId))).get()?.n ?? 0
          if (had >= reward.perPersonLimit) continue
          tx.insert(rewardAwards)
            .values({ id: randomUUID(), rewardId: reward.id, playerId, code: newCode(), status: 'issued', issuedAt: now, expiresAt: now + reward.expiresAfterDays * DAY_MS })
            .run()
        }
      }
    })
  })
}

const statusAt = (status: 'issued' | 'redeemed' | 'expired', expiresAt: number, now: number) => (status === 'issued' && expiresAt <= now ? 'expired' : status)

export function myRewards(db: Db, playerId: string): MyReward[] {
  const now = Date.now()
  return db
    .select({ id: rewardAwards.id, name: rewards.name, description: rewards.description, tier: rewards.tier, code: rewardAwards.code, status: rewardAwards.status, issued_at: rewardAwards.issuedAt, expires_at: rewardAwards.expiresAt })
    .from(rewardAwards)
    .innerJoin(rewards, eq(rewards.id, rewardAwards.rewardId))
    .where(eq(rewardAwards.playerId, playerId))
    .orderBy(asc(rewards.tier), desc(rewardAwards.issuedAt))
    .all()
    .map((row) => ({ ...row, status: statusAt(row.status, row.expires_at, now) }))
}

/** redeem_code: a valid, unexpired, issued code becomes redeemed. Single use. */
export function redeemCode(db: Db, code: string): GameResult<{ code: string; reward: string; status: 'redeemed'; nickname: string | null }> {
  const row = db
    .select({ id: rewardAwards.id, status: rewardAwards.status, expiresAt: rewardAwards.expiresAt, reward: rewards.name, nickname: players.nickname })
    .from(rewardAwards)
    .innerJoin(rewards, eq(rewards.id, rewardAwards.rewardId))
    .leftJoin(players, eq(players.id, rewardAwards.playerId))
    .where(eq(rewardAwards.code, code))
    .get()
  if (!row) return fail('not_found')
  if (row.status === 'redeemed') return fail('already_redeemed')
  if (row.status === 'expired' || row.expiresAt <= Date.now()) return fail('code_expired')
  // Staff have no accounts; "staff" records which role redeemed it.
  const changed = db
    .update(rewardAwards)
    .set({ status: 'redeemed', redeemedAt: Date.now(), redeemedBy: 'staff' })
    .where(and(eq(rewardAwards.id, row.id), eq(rewardAwards.status, 'issued')))
    .run().changes
  if (changed === 0) return fail('already_redeemed')
  return ok({ code, reward: row.reward, status: 'redeemed', nickname: row.nickname })
}

export function staffAwards(db: Db): StaffAward[] {
  const now = Date.now()
  return db
    .select({ id: rewardAwards.id, reward: rewards.name, code: rewardAwards.code, status: rewardAwards.status, expiresAt: rewardAwards.expiresAt, nickname: players.nickname, issued_at: rewardAwards.issuedAt, redeemed_at: rewardAwards.redeemedAt })
    .from(rewardAwards)
    .innerJoin(rewards, eq(rewards.id, rewardAwards.rewardId))
    .leftJoin(players, eq(players.id, rewardAwards.playerId))
    .orderBy(desc(rewardAwards.issuedAt))
    .limit(500)
    .all()
    .map(({ expiresAt, ...row }) => ({ ...row, status: statusAt(row.status, expiresAt, now) }))
}
