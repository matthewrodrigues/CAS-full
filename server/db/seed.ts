import { join } from 'node:path'
import { env } from '../env'
import { DB_FILE, openDb } from './client'
import { seedDemo } from './seed-demo'

const db = openDb(DB_FILE)
const { created } = seedDemo(db, { mediaDir: join(env.DATA_DIR, 'media') })
db.$client.close()

console.log(created ? 'Seeded event DEMO1 (Deep Sea Night).' : 'Already seeded: event DEMO1 exists, nothing changed.')
