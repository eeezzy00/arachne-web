import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type LotDTO } from '../api/client'
import { describeRole } from '../data/roles'
import type { Lot } from '../data/lots'
import { useLanguage } from './LanguageContext'
import { useWallet } from './WalletContext'

// Phase 2: lots live on the backend and are shared by every visitor. Role
// text is still computed on the client since it depends on the UI language,
// which the server has no reason to know about.
const POLL_MS = 6000

type LotPatch = Partial<Pick<LotDTO, 'status' | 'ownerAddress' | 'customName' | 'whisper'>>

export interface LotsStore {
  lots: Lot[]
  loading: boolean
  error: string | null
  purchase: (id: number) => Promise<void>
  sell: (id: number) => Promise<void>
  transfer: (id: number, to: string) => Promise<void>
  rename: (id: number, name: string | null) => Promise<void>
  whisper: (id: number, text: string) => Promise<void>
}

export function useLotsStore(): LotsStore {
  const { lang } = useLanguage()
  const { profile } = useWallet()
  const [rows, setRows] = useState<LotDTO[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rowsRef = useRef<LotDTO[] | null>(null)
  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  const refresh = useCallback(async () => {
    try {
      const data = await api.listLots()
      setRows(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot reach the server')
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const lots = useMemo<Lot[]>(() => {
    if (!rows) return []
    return rows.map((row) => {
      const { role, description } = describeRole(row.ring, row.ray, row.id, lang)
      return { ...row, role, roleDescription: description }
    })
  }, [rows, lang])

  const applyLocal = useCallback((id: number, patch: LotPatch | LotDTO) => {
    setRows((prev) => prev && prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  /** Optimistic update first, then reconciled with the server's response — or rolled back on failure. */
  const run = useCallback(
    async (id: number, optimistic: LotPatch, call: (token: string) => Promise<LotDTO>) => {
      const token = profile?.token
      if (!token) {
        setError('Log in first')
        throw new Error('Log in first')
      }
      const before = rowsRef.current
      applyLocal(id, optimistic)
      try {
        const updated = await call(token)
        applyLocal(id, updated)
        setError(null)
      } catch (err) {
        setRows(before)
        const message = err instanceof Error ? err.message : 'Request failed'
        setError(message)
        throw new Error(message)
      }
    },
    [profile, applyLocal],
  )

  return {
    lots,
    loading: rows === null,
    error,
    purchase: (id) => run(id, { status: 'claimed', ownerAddress: profile?.address ?? null }, (t) => api.claim(t, id)),
    sell: (id) =>
      run(id, { status: 'available', ownerAddress: null, customName: null, whisper: null }, (t) => api.sell(t, id)),
    transfer: (id, to) => run(id, { ownerAddress: to }, (t) => api.transfer(t, id, to)),
    rename: (id, name) => run(id, { customName: name }, (t) => api.rename(t, id, name)),
    whisper: (id, text) => run(id, { status: 'whisper', whisper: text }, (t) => api.whisper(t, id, text)),
  }
}
