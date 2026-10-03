import bs58 from 'bs58'
import type { Lang } from '../state/LanguageContext'
import { readJson, writeJson } from '../utils/storage'
import type { Eip1193Provider, PhantomSolanaProvider } from './types'

function toHex(text: string): string {
  return (
    '0x' +
    Array.from(new TextEncoder().encode(text))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  )
}

export async function requestEvmAccount(provider: Eip1193Provider): Promise<string> {
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const address = accounts[0]
  if (!address) throw new Error('Wallet returned no address')
  return address.toLowerCase()
}

/** Signs the exact message the backend issued as a login challenge. */
export async function signEvmMessage(provider: Eip1193Provider, address: string, message: string): Promise<string> {
  return (await provider.request({ method: 'personal_sign', params: [toHex(message), address] })) as string
}

export async function connectPhantomAccount(solana: PhantomSolanaProvider): Promise<string> {
  const { publicKey } = await solana.connect()
  return publicKey.toString()
}

/** Signs the backend's challenge message and returns a base58 signature, as the server expects. */
export async function signSolanaMessage(solana: PhantomSolanaProvider, message: string): Promise<string> {
  const { signature } = await solana.signMessage(new TextEncoder().encode(message), 'utf8')
  return bs58.encode(signature)
}

export async function revokeEvm(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
  } catch {
    // not every wallet supports revocation; the local session is cleared regardless
  }
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function randomAddress(chain: 'evm' | 'solana'): string {
  if (chain === 'solana') {
    return Array.from({ length: 44 }, () => BASE58[Math.floor(Math.random() * BASE58.length)]).join('')
  }
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

/** Demo wallets keep a stable address per wallet type so "re-login" finds the same profile. */
export async function connectDemo(walletId: string, chain: 'evm' | 'solana'): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  const key = 'arachne.demoAddresses'
  const saved = readJson<Record<string, string>>(key, {})
  if (!saved[walletId]) {
    saved[walletId] = randomAddress(chain)
    writeJson(key, saved)
  }
  return saved[walletId]
}

export function isValidAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
}

export function describeWalletError(error: unknown, lang: Lang): string {
  const code = (error as { code?: number })?.code
  if (code === 4001) return lang === 'en' ? 'Request rejected in the wallet' : 'Запрос отклонён в кошельке'
  if (code === -32002) {
    return lang === 'en'
      ? 'The wallet is already waiting for confirmation — open the extension'
      : 'Кошелёк уже ждёт подтверждения — открой расширение'
  }
  if (error instanceof Error && error.message) return error.message
  return lang === 'en' ? 'Could not connect' : 'Не удалось подключиться'
}
