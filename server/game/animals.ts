// Animal naming prizes and the My Animal feed. Each night offers naming rights as prizes: the
// team(s) finishing in `place` win the right to name that place's animal. A winning team
// proposes a name (profanity-checked, any member, last proposal wins), staff approve one, and
// the animal carries it from then on. Everyone who played follows the night's animals, and
// anyone can follow a named animal to see the updates staff post about it.
import { and, asc, count, desc, eq, inArray, isNotNull, or } from 'drizzle-orm'
import type { AnimalCard, AnimalDetail, AnimalInfo, AnimalUpdate, MyNamingRight, NamingPrize, StaffAnimal, StaffNamingRight } from '../../shared/game'
import type { Db } from '../db/client'
import { eventLeaderboard } from '../db/queries'
import { animalFollows, animals, animalUpdates, events, namingPrizes, namingRights, teamMembers, teams } from '../db/schema'
import { fail, ok, type GameResult } from './context'
import { isProfane } from './teams'

type AnimalRow = typeof animals.$inferSelect

const info = (a: AnimalRow): AnimalInfo => ({
  id: a.id,
  species: a.species,
  scientific_name: a.scientificName,
  exhibit: a.exhibit,
  about: a.about,
  image_url: a.imageUrl,
  name: a.name,
  named_at: a.namedAt,
  named_by_team: a.namedByTeam,
})

const update = (u: typeof animalUpdates.$inferSelect): AnimalUpdate => ({ id: u.id, body: u.body, posted_at: u.postedAt })

/** At `ended`: naming rights to the teams in each prize's place (points above zero), and every player follows the night's animals. */
export function awardNamingRights(db: Db, eventId: string) {
  const prizes = db
    .select({ prize: namingPrizes, named: animals.name })
    .from(namingPrizes)
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .where(eq(namingPrizes.eventId, eventId))
    .all()
  if (prizes.length === 0) return
  const board = eventLeaderboard(db, eventId)
  const now = Date.now()
  db.transaction((tx) => {
    for (const { prize, named } of prizes) {
      if (named !== null) continue
      for (const team of board.filter((row) => row.rank === prize.place && row.points > 0)) {
        tx.insert(namingRights).values({ prizeId: prize.id, teamId: team.teamId, createdAt: now }).onConflictDoNothing().run()
      }
    }
    const playerIds = tx.select({ playerId: teamMembers.playerId }).from(teamMembers).where(eq(teamMembers.eventId, eventId)).all()
    for (const { playerId } of playerIds) {
      for (const { prize } of prizes) {
        tx.insert(animalFollows).values({ playerId, animalId: prize.animalId, followedAt: now }).onConflictDoNothing().run()
      }
    }
  })
}

/** Tonight's prizes, for the lobby, the big screen and the Rewards tab. */
export function eventPrizes(db: Db, eventId: string): NamingPrize[] {
  return db
    .select({ place: namingPrizes.place, animal: animals })
    .from(namingPrizes)
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .where(eq(namingPrizes.eventId, eventId))
    .orderBy(asc(namingPrizes.place))
    .all()
    .map((row) => ({ place: row.place, animal: info(row.animal) }))
}

export function myNamingRights(db: Db, playerId: string): MyNamingRight[] {
  return db
    .select({ right: namingRights, place: namingPrizes.place, teamName: teams.name, animal: animals })
    .from(namingRights)
    .innerJoin(namingPrizes, eq(namingPrizes.id, namingRights.prizeId))
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .innerJoin(teams, eq(teams.id, namingRights.teamId))
    .innerJoin(teamMembers, and(eq(teamMembers.teamId, teams.id), eq(teamMembers.playerId, playerId)))
    .orderBy(desc(namingRights.createdAt), asc(namingPrizes.place))
    .all()
    .map((row) => ({
      id: row.right.id,
      place: row.place,
      status: row.right.status,
      proposed_name: row.right.proposedName,
      team_id: row.right.teamId,
      team_name: row.teamName,
      animal: info(row.animal),
    }))
}

/** Any member of the winning team may propose; a new proposal replaces the last until staff approve one. */
export function proposeAnimalName(db: Db, { playerId, rightId, name }: { playerId: string; rightId: string; name: string }): GameResult<MyNamingRight> {
  const row = db
    .select({ right: namingRights, named: animals.name })
    .from(namingRights)
    .innerJoin(namingPrizes, eq(namingPrizes.id, namingRights.prizeId))
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .where(eq(namingRights.id, rightId))
    .get()
  if (!row) return fail('not_found')
  const member = db.select({ teamId: teamMembers.teamId }).from(teamMembers).where(and(eq(teamMembers.teamId, row.right.teamId), eq(teamMembers.playerId, playerId))).get()
  if (!member) return fail('not_on_team')
  if (row.named !== null || row.right.status === 'approved') return fail('already_named')
  if (isProfane(name)) return fail('name_not_allowed')
  db.update(namingRights).set({ status: 'pending', proposedName: name, proposedBy: playerId, proposedAt: Date.now(), reviewedAt: null }).where(eq(namingRights.id, rightId)).run()
  return ok(myNamingRights(db, playerId).find((r) => r.id === rightId)!)
}

function cards(db: Db, playerId: string | null, rows: AnimalRow[]): AnimalCard[] {
  if (rows.length === 0) return []
  const ids = rows.map((a) => a.id)
  const followed = new Set(
    playerId
      ? db
          .select({ animalId: animalFollows.animalId })
          .from(animalFollows)
          .where(and(eq(animalFollows.playerId, playerId), inArray(animalFollows.animalId, ids)))
          .all()
          .map((f) => f.animalId)
      : [],
  )
  const updates = db.select().from(animalUpdates).where(inArray(animalUpdates.animalId, ids)).orderBy(desc(animalUpdates.postedAt)).all()
  return rows.map((a) => {
    const mine = updates.filter((u) => u.animalId === a.id)
    return { ...info(a), following: followed.has(a.id), update_count: mine.length, latest_update: mine[0] ? update(mine[0]) : null }
  })
}

/** The Animals tab: what the player follows, then every named animal. Unnamed animals appear once followed (e.g. after playing for one). */
export function listAnimals(db: Db, playerId: string | null): AnimalCard[] {
  const followedIds = playerId ? db.select({ id: animalFollows.animalId }).from(animalFollows).where(eq(animalFollows.playerId, playerId)).all().map((f) => f.id) : []
  const rows = db
    .select()
    .from(animals)
    .where(followedIds.length ? or(isNotNull(animals.name), inArray(animals.id, followedIds)) : isNotNull(animals.name))
    .orderBy(desc(animals.namedAt), asc(animals.species))
    .all()
  return cards(db, playerId, rows).sort((a, b) => Number(b.following) - Number(a.following))
}

export function animalDetail(db: Db, playerId: string | null, animalId: string): GameResult<AnimalDetail> {
  const row = db.select().from(animals).where(eq(animals.id, animalId)).get()
  if (!row) return fail('not_found')
  const [card] = cards(db, playerId, [row])
  const updates = db.select().from(animalUpdates).where(eq(animalUpdates.animalId, animalId)).orderBy(desc(animalUpdates.postedAt)).all().map(update)
  return ok({ ...card, updates })
}

export function followAnimal(db: Db, { playerId, animalId, follow }: { playerId: string; animalId: string; follow: boolean }): GameResult<{ following: boolean }> {
  if (!db.select({ id: animals.id }).from(animals).where(eq(animals.id, animalId)).get()) return fail('not_found')
  if (follow) db.insert(animalFollows).values({ playerId, animalId, followedAt: Date.now() }).onConflictDoNothing().run()
  else db.delete(animalFollows).where(and(eq(animalFollows.playerId, playerId), eq(animalFollows.animalId, animalId))).run()
  return ok({ following: follow })
}

// Staff -------------------------------------------------------------------------------------

export function staffAnimals(db: Db): StaffAnimal[] {
  const rows = db.select().from(animals).orderBy(asc(animals.createdAt)).all()
  const prizes = db.select({ animalId: namingPrizes.animalId, eventId: namingPrizes.eventId, place: namingPrizes.place, joinCode: events.joinCode }).from(namingPrizes).innerJoin(events, eq(events.id, namingPrizes.eventId)).all()
  const updates = db.select({ animalId: animalUpdates.animalId, n: count() }).from(animalUpdates).groupBy(animalUpdates.animalId).all()
  const followers = db.select({ animalId: animalFollows.animalId, n: count() }).from(animalFollows).groupBy(animalFollows.animalId).all()
  return rows.map((a) => {
    const prize = prizes.find((p) => p.animalId === a.id)
    return {
      ...info(a),
      update_count: updates.find((u) => u.animalId === a.id)?.n ?? 0,
      follower_count: followers.find((f) => f.animalId === a.id)?.n ?? 0,
      prize: prize ? { event_id: prize.eventId, join_code: prize.joinCode, place: prize.place } : null,
    }
  })
}

/** Proposals waiting for staff, oldest first, for animals that still have no name. */
export function staffNamingRights(db: Db): StaffNamingRight[] {
  return db
    .select({ right: namingRights, teamName: teams.name, joinCode: events.joinCode, place: namingPrizes.place, animalId: animals.id, species: animals.species })
    .from(namingRights)
    .innerJoin(namingPrizes, eq(namingPrizes.id, namingRights.prizeId))
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .innerJoin(events, eq(events.id, namingPrizes.eventId))
    .innerJoin(teams, eq(teams.id, namingRights.teamId))
    .where(and(eq(namingRights.status, 'pending'), isNotNull(namingRights.proposedName)))
    .orderBy(asc(namingRights.proposedAt))
    .all()
    .map((row) => ({
      id: row.right.id,
      status: row.right.status,
      proposed_name: row.right.proposedName,
      proposed_at: row.right.proposedAt,
      team_name: row.teamName,
      join_code: row.joinCode,
      place: row.place,
      animal: { id: row.animalId, species: row.species },
    }))
}

export function createAnimal(db: Db, input: { species: string; scientific_name: string | null; exhibit: string; about: string | null }): GameResult<StaffAnimal> {
  const id = crypto.randomUUID()
  db.insert(animals).values({ id, species: input.species, scientificName: input.scientific_name, exhibit: input.exhibit, about: input.about, createdAt: Date.now() }).run()
  return ok(staffAnimals(db).find((a) => a.id === id)!)
}

/** Sets (or, with a null animal, clears) the prize for one place at a night that hasn't ended. */
export function setNamingPrize(db: Db, { eventId, place, animalId }: { eventId: string; place: number; animalId: string | null }): GameResult<{ prizes: NamingPrize[] }> {
  const event = db.select({ status: events.status }).from(events).where(eq(events.id, eventId)).get()
  if (!event) return fail('not_found')
  if (event.status === 'ended') return fail('event_ended')
  if (animalId) {
    const animal = db.select({ name: animals.name }).from(animals).where(eq(animals.id, animalId)).get()
    if (!animal) return fail('not_found')
    if (animal.name !== null) return fail('already_named')
    const offered = db.select({ eventId: namingPrizes.eventId, place: namingPrizes.place }).from(namingPrizes).where(eq(namingPrizes.animalId, animalId)).get()
    if (offered && !(offered.eventId === eventId && offered.place === place)) return fail('animal_taken')
  }
  db.transaction((tx) => {
    tx.delete(namingPrizes).where(and(eq(namingPrizes.eventId, eventId), eq(namingPrizes.place, place))).run()
    if (animalId) tx.insert(namingPrizes).values({ eventId, place, animalId }).run()
  })
  return ok({ prizes: eventPrizes(db, eventId) })
}

/** Approving names the animal for good; rejecting lets the team propose again. */
export function reviewAnimalName(db: Db, { rightId, status }: { rightId: string; status: 'approved' | 'rejected' }): GameResult<{ id: string; status: 'approved' | 'rejected' }> {
  const row = db
    .select({ right: namingRights, prize: namingPrizes, named: animals.name, team: teams })
    .from(namingRights)
    .innerJoin(namingPrizes, eq(namingPrizes.id, namingRights.prizeId))
    .innerJoin(animals, eq(animals.id, namingPrizes.animalId))
    .innerJoin(teams, eq(teams.id, namingRights.teamId))
    .where(eq(namingRights.id, rightId))
    .get()
  if (!row) return fail('not_found')
  if (row.right.status !== 'pending' || !row.right.proposedName) return fail('not_pending')
  if (row.named !== null) return fail('already_named')
  const now = Date.now()
  db.transaction((tx) => {
    tx.update(namingRights).set({ status, reviewedAt: now }).where(eq(namingRights.id, rightId)).run()
    if (status === 'approved') {
      tx.update(animals)
        .set({ name: row.right.proposedName, namedAt: now, namedEventId: row.prize.eventId, namedByTeam: row.team.nameStatus === 'approved' ? row.team.name : null })
        .where(eq(animals.id, row.prize.animalId))
        .run()
    }
  })
  return ok({ id: rightId, status })
}

export function postAnimalUpdate(db: Db, { animalId, body }: { animalId: string; body: string }): GameResult<AnimalUpdate> {
  if (!db.select({ id: animals.id }).from(animals).where(eq(animals.id, animalId)).get()) return fail('not_found')
  const row = { id: crypto.randomUUID(), animalId, body, postedAt: Date.now() }
  db.insert(animalUpdates).values(row).run()
  return ok(update(row))
}
