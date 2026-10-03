import bs58 from 'bs58'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import nacl from 'tweetnacl'
import { verifyMessage } from 'viem'
import type { AuthedRequest, Chain } from './types.ts'

const JWT_SECRET = process.env.JWT_SECRET ?? 'arachne-dev-secret-change-me'
const NONCE_TTL_MS = 5 * 60 * 1000

// address -> { message, expires } — short-lived, in memory is fine for a single-process dev server
const pendingChallenges = new Map<string, { message: string; expires: number }>()

export function issueChallenge(address: string): string {
  const message = `I enter the web. Address: ${address}. Timestamp: ${Date.now()}`
  pendingChallenges.set(address.toLowerCase(), { message, expires: Date.now() + NONCE_TTL_MS })
  return message
}

function takeChallenge(address: string): string | null {
  const key = address.toLowerCase()
  const entry = pendingChallenges.get(key)
  if (!entry) return null
  pendingChallenges.delete(key)
  if (entry.expires < Date.now()) return null
  return entry.message
}

export async function verifySignature(address: string, chain: Chain, signature: string): Promise<boolean> {
  const message = takeChallenge(address)
  if (!message) return false

  if (chain === 'evm') {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false
    try {
      return await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` })
    } catch {
      return false
    }
  }

  // solana: signature and address both arrive base58-encoded
  try {
    const sigBytes = bs58.decode(signature)
    const pubKeyBytes = bs58.decode(address)
    const msgBytes = new TextEncoder().encode(message)
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes)
  } catch {
    return false
  }
}

export function issueToken(address: string, chain: Chain): string {
  return jwt.sign({ address: address.toLowerCase(), chain }, JWT_SECRET, { expiresIn: '30d' })
}

export interface AuthedLocals {
  auth: AuthedRequest
}

/** Populates req.auth from a bearer token; rejects the request if it's missing or invalid. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'missing bearer token' })
    return
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { address: string; chain: Chain }
    ;(req as Request & Partial<AuthedLocals>).auth = { address: payload.address, chain: payload.chain }
    next()
  } catch {
    res.status(401).json({ error: 'invalid or expired token' })
  }
}

export function authOf(req: Request): AuthedRequest {
  const auth = (req as Request & Partial<AuthedLocals>).auth
  if (!auth) throw new Error('requireAuth must run before authOf is used')
  return auth
}
