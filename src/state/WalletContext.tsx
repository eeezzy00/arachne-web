import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError } from '../api/client'
import { useArchive } from './ArchiveContext'
import { useLanguage } from './LanguageContext'
import { lines } from '../i18n/lines'
import { readJson, removeKey, writeJson } from '../utils/storage'
import { shortenAddress } from '../utils/fakeWallet'
import { KNOWN_WALLETS } from '../wallet/wallets'
import { useInjectedWallets } from '../wallet/useInjectedWallets'
import {
  connectDemo,
  connectPhantomAccount,
  describeWalletError,
  requestEvmAccount,
  revokeEvm,
  signEvmMessage,
  signSolanaMessage,
} from '../wallet/connectors'
import type { ChainKind, Eip1193Provider } from '../wallet/types'

export interface WalletOption {
  id: string
  name: string
  chain: ChainKind
  icon: string | null
  badge: string
  color: string
  installed: boolean
  /** true when connecting will simulate the wallet instead of calling an extension */
  demo: boolean
  evmProvider: Eip1193Provider | null
}

export interface WalletProfile {
  address: string
  chain: ChainKind
  walletId: string
  walletName: string
  walletIcon: string | null
  demo: boolean
  nickname: string
  createdAt: number
  lastLoginAt: number
  /** bearer token for the backend — session is only as good as the server says it is */
  token: string
}

const SESSION_KEY = 'arachne.session'

interface WalletContextValue {
  profile: WalletProfile | null
  options: WalletOption[]
  connectingId: string | null
  error: string | null
  pickerOpen: boolean
  openPicker: () => void
  closePicker: () => void
  connect: (option: WalletOption) => Promise<void>
  disconnect: () => Promise<void>
  setNickname: (nickname: string) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { log } = useArchive()
  const { lang } = useLanguage()
  const injected = useInjectedWallets()
  const [profile, setProfile] = useState<WalletProfile | null>(() => readJson<WalletProfile | null>(SESSION_KEY, null))
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeProvider = useRef<Eip1193Provider | null>(null)

  const options = useMemo<WalletOption[]>(() => {
    const phantomSolana = typeof window !== 'undefined' ? window.phantom?.solana : undefined
    const known = KNOWN_WALLETS.map((def) => {
      const detail = def.rdns ? injected.find((w) => w.info.rdns === def.rdns) : undefined
      let evmProvider = detail?.provider ?? null
      if (!evmProvider && def.id === 'metamask' && window.ethereum?.isMetaMask) evmProvider = window.ethereum
      const icon =
        detail?.info.icon ??
        (def.id === 'phantom' ? (injected.find((w) => w.info.rdns === 'app.phantom')?.info.icon ?? null) : null)
      const installed = def.id === 'phantom' ? !!phantomSolana?.isPhantom : !!evmProvider
      return {
        id: def.id,
        name: def.name,
        chain: def.chain,
        icon,
        badge: def.badge,
        color: def.color,
        installed,
        demo: def.demoOnly === true || !installed,
        evmProvider,
      }
    })
    const knownRdns = new Set([...KNOWN_WALLETS.map((w) => w.rdns), 'app.phantom'])
    const extra = injected
      .filter((w) => !knownRdns.has(w.info.rdns))
      .map((w) => ({
        id: w.info.uuid,
        name: w.info.name,
        chain: 'evm' as const,
        icon: w.info.icon,
        badge: w.info.name.charAt(0).toUpperCase(),
        color: '#888888',
        installed: true,
        demo: false,
        evmProvider: w.provider,
      }))
    return [...known, ...extra]
  }, [injected])

  const endSession = useCallback(() => {
    removeKey(SESSION_KEY)
    activeProvider.current = null
    setProfile(null)
  }, [])

  // the cached session is shown immediately, then re-validated against the
  // server in the background — a dead/expired token quietly logs out
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    api
      .me(profile.token)
      .then((fresh) => {
        if (cancelled) return
        setProfile((prev) =>
          prev ? { ...prev, nickname: fresh.nickname, createdAt: fresh.createdAt, lastLoginAt: fresh.lastLoginAt } : prev,
        )
      })
      .catch(() => {
        if (!cancelled) endSession()
      })
    return () => {
      cancelled = true
    }
    // only runs once per login (address change), not on every profile field update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.address])

  useEffect(() => {
    if (profile) writeJson(SESSION_KEY, profile)
  }, [profile])

  // a real wallet switching or locking its account invalidates the signed session
  useEffect(() => {
    const provider = activeProvider.current
    if (!provider?.on || !profile) return
    const address = profile.address
    const onAccounts = (...args: unknown[]) => {
      const accounts = ((args[0] as string[]) ?? []).map((a) => a.toLowerCase())
      if (!accounts.includes(address)) {
        log(lines.walletSwitched(lang), 'alert')
        endSession()
      }
    }
    provider.on('accountsChanged', onAccounts)
    return () => provider.removeListener?.('accountsChanged', onAccounts)
  }, [profile, endSession, log, lang])

  const connect = useCallback(
    async (option: WalletOption) => {
      setError(null)
      setConnectingId(option.id)
      try {
        let address: string
        let auth: { token: string; profile: { nickname: string; createdAt: number; lastLoginAt: number }; isNew: boolean }

        if (option.demo) {
          address = await connectDemo(option.id, option.chain)
          auth = await api.demo(address, option.chain)
        } else if (option.chain === 'solana') {
          const solana = window.phantom!.solana!
          address = await connectPhantomAccount(solana)
          const { message } = await api.challenge(address, 'solana')
          const signature = await signSolanaMessage(solana, message)
          auth = await api.verify(address, 'solana', signature)
        } else {
          address = await requestEvmAccount(option.evmProvider!)
          const { message } = await api.challenge(address, 'evm')
          const signature = await signEvmMessage(option.evmProvider!, address, message)
          activeProvider.current = option.evmProvider
          auth = await api.verify(address, 'evm', signature)
        }

        const next: WalletProfile = {
          address,
          chain: option.chain,
          walletId: option.id,
          walletName: option.name,
          walletIcon: option.icon,
          demo: option.demo,
          nickname: auth.profile.nickname,
          createdAt: auth.profile.createdAt,
          lastLoginAt: auth.profile.lastLoginAt,
          token: auth.token,
        }
        setProfile(next)
        setPickerOpen(false)
        log(
          auth.isNew
            ? lines.newProfile(lang, next.nickname, shortenAddress(address))
            : lines.profileReturned(lang, next.nickname, option.name),
          'good',
        )
      } catch (err) {
        setError(err instanceof ApiError ? err.message : describeWalletError(err, lang))
      } finally {
        setConnectingId(null)
      }
    },
    [log, lang],
  )

  const disconnect = useCallback(async () => {
    if (!profile) return
    if (!profile.demo) {
      if (profile.chain === 'solana') await window.phantom?.solana?.disconnect().catch(() => undefined)
      else if (activeProvider.current) await revokeEvm(activeProvider.current)
    }
    log(lines.walletUnlinked(lang, profile.nickname, shortenAddress(profile.address)), 'dim')
    endSession()
  }, [profile, endSession, log, lang])

  const setNickname = useCallback(
    (nickname: string) => {
      if (!profile) return
      setProfile({ ...profile, nickname })
      api.setNickname(profile.token, nickname).catch(() => {
        // best-effort: the optimistic nickname stays even if the sync fails
      })
    },
    [profile],
  )

  const value = useMemo<WalletContextValue>(
    () => ({
      profile,
      options,
      connectingId,
      error,
      pickerOpen,
      openPicker: () => {
        setError(null)
        setPickerOpen(true)
      },
      closePicker: () => setPickerOpen(false),
      connect,
      disconnect,
      setNickname,
    }),
    [profile, options, connectingId, error, pickerOpen, connect, disconnect, setNickname],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
