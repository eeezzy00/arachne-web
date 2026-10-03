import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { makeEntry, type ArchiveEntry, type ArchiveTone } from '../data/archive'

interface ArchiveContextValue {
  entries: ArchiveEntry[]
  log: (text: string, tone?: ArchiveTone) => void
  push: (entry: ArchiveEntry) => void
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null)

const MAX_ENTRIES = 40

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([])

  const push = useCallback((entry: ArchiveEntry) => {
    setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES))
  }, [])

  const log = useCallback((text: string, tone?: ArchiveTone) => push(makeEntry(text, tone)), [push])

  const value = useMemo(() => ({ entries, log, push }), [entries, log, push])
  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>
}

export function useArchive(): ArchiveContextValue {
  const ctx = useContext(ArchiveContext)
  if (!ctx) throw new Error('useArchive must be used within ArchiveProvider')
  return ctx
}
