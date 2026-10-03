import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { readJson, writeJson } from '../utils/storage'

export type Lang = 'en' | 'ru'

const KEY = 'arachne.lang'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readJson<Lang>(KEY, 'en'))

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    writeJson(KEY, next)
  }, [])

  const toggle = useCallback(() => setLang(lang === 'en' ? 'ru' : 'en'), [lang, setLang])

  const value = useMemo(() => ({ lang, setLang, toggle }), [lang, setLang, toggle])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
