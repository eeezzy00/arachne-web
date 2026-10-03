import { useEffect, useState } from 'react'
import type { Eip6963ProviderDetail } from './types'

/** Discovers installed EVM wallets via EIP-6963 (one entry per extension). */
export function useInjectedWallets(): Eip6963ProviderDetail[] {
  const [wallets, setWallets] = useState<Eip6963ProviderDetail[]>([])

  useEffect(() => {
    function onAnnounce(event: CustomEvent<Eip6963ProviderDetail>) {
      const detail = event.detail
      setWallets((prev) =>
        prev.some((w) => w.info.uuid === detail.info.uuid) ? prev : [...prev, detail],
      )
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    return () => window.removeEventListener('eip6963:announceProvider', onAnnounce)
  }, [])

  return wallets
}
