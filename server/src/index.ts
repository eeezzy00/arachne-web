import cors from 'cors'
import express from 'express'
import {
  claimLot,
  getLot,
  getUser,
  listLots,
  renameLot,
  sellLot,
  setNickname,
  transferLot,
  upsertLogin,
  whisperLot,
} from './db.ts'
import { authOf, issueChallenge, issueToken, requireAuth, verifySignature } from './auth.ts'
import { generateNickname } from './nickname.ts'
import type { Chain } from './types.ts'

const PORT = Number(process.env.PORT ?? 8787)
const app = express()

app.use(cors())
app.use(express.json())

function isChain(value: unknown): value is Chain {
  return value === 'evm' || value === 'solana'
}

function isEvmAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
}

function isSolanaAddress(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
}

function normalizeAddress(address: string, chain: Chain): string {
  return chain === 'evm' ? address.toLowerCase() : address
}

// ---- lots ----

app.get('/api/lots', (_req, res) => {
  res.json(listLots())
})

app.post('/api/lots/:id/claim', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { address } = authOf(req)
  const lot = getLot(id)
  if (!lot) return res.status(404).json({ error: 'no such lot' })
  if (lot.status !== 'available') return res.status(409).json({ error: 'lot already claimed' })
  const updated = claimLot(id, address)
  if (!updated) return res.status(409).json({ error: 'claim raced — try another lot' })
  res.json(updated)
})

app.post('/api/lots/:id/sell', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { address } = authOf(req)
  const updated = sellLot(id, address)
  if (!updated) return res.status(403).json({ error: 'not your lot' })
  res.json(updated)
})

app.post('/api/lots/:id/transfer', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { address } = authOf(req)
  const to = typeof req.body?.to === 'string' ? req.body.to.trim() : ''
  if (!isEvmAddress(to) && !isSolanaAddress(to)) return res.status(400).json({ error: 'invalid recipient address' })
  const updated = transferLot(id, address, isEvmAddress(to) ? to.toLowerCase() : to)
  if (!updated) return res.status(403).json({ error: 'not your lot' })
  res.json(updated)
})

app.post('/api/lots/:id/rename', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { address } = authOf(req)
  const raw = req.body?.name
  const name = typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 20).toUpperCase() : null
  const updated = renameLot(id, address, name)
  if (!updated) return res.status(403).json({ error: 'not your lot' })
  res.json(updated)
})

app.post('/api/lots/:id/whisper', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const { address } = authOf(req)
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 80) : ''
  if (!text) return res.status(400).json({ error: 'whisper cannot be empty' })
  const updated = whisperLot(id, address, text)
  if (!updated) return res.status(403).json({ error: 'not your lot' })
  res.json(updated)
})

// ---- auth ----

app.post('/api/auth/challenge', (req, res) => {
  const { address, chain } = req.body ?? {}
  if (!isChain(chain)) return res.status(400).json({ error: 'chain must be "evm" or "solana"' })
  if (chain === 'evm' ? !isEvmAddress(address) : !isSolanaAddress(address)) {
    return res.status(400).json({ error: 'invalid address for chain' })
  }
  const message = issueChallenge(normalizeAddress(address, chain))
  res.json({ message })
})

app.post('/api/auth/verify', async (req, res) => {
  const { address, chain, signature } = req.body ?? {}
  if (!isChain(chain)) return res.status(400).json({ error: 'chain must be "evm" or "solana"' })
  if (chain === 'evm' ? !isEvmAddress(address) : !isSolanaAddress(address)) {
    return res.status(400).json({ error: 'invalid address for chain' })
  }
  if (typeof signature !== 'string' || !signature) return res.status(400).json({ error: 'missing signature' })

  const normalized = normalizeAddress(address, chain)
  const ok = await verifySignature(normalized, chain, signature)
  if (!ok) return res.status(401).json({ error: 'signature does not match the issued challenge' })

  const { user, isNew } = upsertLogin(normalized, chain, generateNickname())
  res.json({ token: issueToken(normalized, chain), profile: user, isNew })
})

// Demo wallets (no browser extension present) skip signature verification —
// Phase 1/2 explicitly allows this; it is never used for a real funded wallet.
app.post('/api/auth/demo', (req, res) => {
  const { address, chain } = req.body ?? {}
  if (!isChain(chain)) return res.status(400).json({ error: 'chain must be "evm" or "solana"' })
  if (chain === 'evm' ? !isEvmAddress(address) : !isSolanaAddress(address)) {
    return res.status(400).json({ error: 'invalid address for chain' })
  }
  const normalized = normalizeAddress(address, chain)
  const { user, isNew } = upsertLogin(normalized, chain, generateNickname())
  res.json({ token: issueToken(normalized, chain), profile: user, isNew })
})

app.get('/api/profile/me', requireAuth, (req, res) => {
  const { address } = authOf(req)
  const user = getUser(address)
  if (!user) return res.status(404).json({ error: 'no such profile' })
  res.json(user)
})

app.post('/api/profile/nickname', requireAuth, (req, res) => {
  const { address } = authOf(req)
  const raw = req.body?.nickname
  const nickname = typeof raw === 'string' ? raw.trim().slice(0, 20).toUpperCase() : ''
  if (!nickname) return res.status(400).json({ error: 'nickname cannot be empty' })
  const updated = setNickname(address, nickname)
  if (!updated) return res.status(404).json({ error: 'no such profile' })
  res.json(updated)
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`arachne-server listening on http://localhost:${PORT}`)
})
