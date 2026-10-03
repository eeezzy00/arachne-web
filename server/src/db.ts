import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildSeedLots } from './seed.ts'
import type { Chain, LotRow, LotStatus, UserRow } from './types.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(here, '..', 'data', 'arachne.sqlite')

export const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY,
    ring INTEGER NOT NULL,
    ray INTEGER NOT NULL,
    status TEXT NOT NULL,
    owner_address TEXT,
    custom_name TEXT,
    whisper TEXT,
    price_usd REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    chain TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL
  );
`)

const lotCount = db.prepare('SELECT COUNT(*) AS n FROM lots').get() as { n: number }
if (lotCount.n === 0) {
  const insert = db.prepare(
    `INSERT INTO lots (id, ring, ray, status, owner_address, custom_name, whisper, price_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  db.exec('BEGIN')
  try {
    for (const lot of buildSeedLots()) {
      insert.run(lot.id, lot.ring, lot.ray, lot.status, lot.ownerAddress, lot.customName, lot.whisper, lot.priceUsd)
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

function rowToLot(row: Record<string, unknown>): LotRow {
  return {
    id: row.id as number,
    ring: row.ring as number,
    ray: row.ray as number,
    status: row.status as LotStatus,
    ownerAddress: (row.owner_address as string | null) ?? null,
    customName: (row.custom_name as string | null) ?? null,
    whisper: (row.whisper as string | null) ?? null,
    priceUsd: row.price_usd as number,
  }
}

export function listLots(): LotRow[] {
  const rows = db.prepare('SELECT * FROM lots ORDER BY id').all() as Record<string, unknown>[]
  return rows.map(rowToLot)
}

export function getLot(id: number): LotRow | null {
  const row = db.prepare('SELECT * FROM lots WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? rowToLot(row) : null
}

export function claimLot(id: number, owner: string): LotRow | null {
  const result = db
    .prepare(`UPDATE lots SET status = 'claimed', owner_address = ? WHERE id = ? AND status = 'available'`)
    .run(owner, id)
  if (result.changes === 0) return null
  return getLot(id)
}

export function sellLot(id: number, owner: string): LotRow | null {
  const result = db
    .prepare(
      `UPDATE lots SET status = 'available', owner_address = NULL, custom_name = NULL, whisper = NULL
       WHERE id = ? AND owner_address = ?`,
    )
    .run(id, owner)
  if (result.changes === 0) return null
  return getLot(id)
}

export function transferLot(id: number, owner: string, to: string): LotRow | null {
  const result = db
    .prepare('UPDATE lots SET owner_address = ? WHERE id = ? AND owner_address = ?')
    .run(to, id, owner)
  if (result.changes === 0) return null
  return getLot(id)
}

export function renameLot(id: number, owner: string, name: string | null): LotRow | null {
  const result = db
    .prepare('UPDATE lots SET custom_name = ? WHERE id = ? AND owner_address = ?')
    .run(name, id, owner)
  if (result.changes === 0) return null
  return getLot(id)
}

export function whisperLot(id: number, owner: string, text: string): LotRow | null {
  const result = db
    .prepare(`UPDATE lots SET status = 'whisper', whisper = ? WHERE id = ? AND owner_address = ?`)
    .run(text, id, owner)
  if (result.changes === 0) return null
  return getLot(id)
}

function rowToUser(row: Record<string, unknown>): UserRow {
  return {
    address: row.address as string,
    nickname: row.nickname as string,
    chain: row.chain as Chain,
    createdAt: row.created_at as number,
    lastLoginAt: row.last_login_at as number,
  }
}

export function getUser(address: string): UserRow | null {
  const row = db.prepare('SELECT * FROM users WHERE address = ?').get(address) as Record<string, unknown> | undefined
  return row ? rowToUser(row) : null
}

/** Registers a brand-new profile, or just bumps last_login_at for a returning one. */
export function upsertLogin(address: string, chain: Chain, nickname: string): { user: UserRow; isNew: boolean } {
  const existing = getUser(address)
  const now = Date.now()
  if (existing) {
    db.prepare('UPDATE users SET last_login_at = ? WHERE address = ?').run(now, address)
    return { user: { ...existing, lastLoginAt: now }, isNew: false }
  }
  db.prepare('INSERT INTO users (address, nickname, chain, created_at, last_login_at) VALUES (?, ?, ?, ?, ?)').run(
    address,
    nickname,
    chain,
    now,
    now,
  )
  return { user: { address, nickname, chain, createdAt: now, lastLoginAt: now }, isNew: true }
}

export function setNickname(address: string, nickname: string): UserRow | null {
  const result = db.prepare('UPDATE users SET nickname = ? WHERE address = ?').run(nickname, address)
  if (result.changes === 0) return null
  return getUser(address)
}
