export type LotStatus = 'available' | 'claimed' | 'active' | 'whisper'
export type Chain = 'evm' | 'solana'

export interface LotRow {
  id: number
  ring: number
  ray: number
  status: LotStatus
  ownerAddress: string | null
  customName: string | null
  whisper: string | null
  priceUsd: number
}

export interface UserRow {
  address: string
  nickname: string
  chain: Chain
  createdAt: number
  lastLoginAt: number
}

export interface AuthedRequest {
  address: string
  chain: Chain
}
