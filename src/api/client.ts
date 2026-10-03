import type { ChainKind } from '../wallet/types'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787'

export type LotStatus = 'available' | 'claimed' | 'active' | 'whisper'

export interface LotDTO {
  id: number
  ring: number
  ray: number
  status: LotStatus
  ownerAddress: string | null
  customName: string | null
  whisper: string | null
  priceUsd: number
}

export interface ServerProfile {
  address: string
  nickname: string
  chain: ChainKind
  createdAt: number
  lastLoginAt: number
}

interface AuthResult {
  token: string
  profile: ServerProfile
  isNew: boolean
}

class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, headers, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError('Cannot reach the server')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error ?? `request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  listLots: () => request<LotDTO[]>('/api/lots'),

  challenge: (address: string, chain: ChainKind) =>
    request<{ message: string }>('/api/auth/challenge', {
      method: 'POST',
      body: JSON.stringify({ address, chain }),
    }),
  verify: (address: string, chain: ChainKind, signature: string) =>
    request<AuthResult>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address, chain, signature }),
    }),
  demo: (address: string, chain: ChainKind) =>
    request<AuthResult>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ address, chain }),
    }),
  me: (token: string) => request<ServerProfile>('/api/profile/me', { token }),
  setNickname: (token: string, nickname: string) =>
    request<ServerProfile>('/api/profile/nickname', { method: 'POST', token, body: JSON.stringify({ nickname }) }),

  claim: (token: string, id: number) => request<LotDTO>(`/api/lots/${id}/claim`, { method: 'POST', token }),
  sell: (token: string, id: number) => request<LotDTO>(`/api/lots/${id}/sell`, { method: 'POST', token }),
  transfer: (token: string, id: number, to: string) =>
    request<LotDTO>(`/api/lots/${id}/transfer`, { method: 'POST', token, body: JSON.stringify({ to }) }),
  rename: (token: string, id: number, name: string | null) =>
    request<LotDTO>(`/api/lots/${id}/rename`, { method: 'POST', token, body: JSON.stringify({ name }) }),
  whisper: (token: string, id: number, text: string) =>
    request<LotDTO>(`/api/lots/${id}/whisper`, { method: 'POST', token, body: JSON.stringify({ text }) }),
}

export { ApiError }
