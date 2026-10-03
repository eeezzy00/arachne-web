import type { ChainKind } from './types'

export interface WalletDef {
  id: string
  name: string
  chain: ChainKind
  /** EIP-6963 reverse-DNS id used to match an installed extension */
  rdns?: string
  /** pixel badge shown when the extension provides no icon */
  badge: string
  color: string
  /** needs infrastructure that arrives in Phase 2 */
  demoOnly?: boolean
}

export const KNOWN_WALLETS: WalletDef[] = [
  { id: 'metamask', name: 'MetaMask', chain: 'evm', rdns: 'io.metamask', badge: 'M', color: '#f6851b' },
  { id: 'phantom', name: 'Phantom', chain: 'solana', badge: 'P', color: '#ab9ff2' },
  { id: 'coinbase', name: 'Coinbase Wallet', chain: 'evm', rdns: 'com.coinbase.wallet', badge: 'C', color: '#3773f5' },
  { id: 'rabby', name: 'Rabby', chain: 'evm', rdns: 'io.rabby', badge: 'R', color: '#7084ff' },
  { id: 'walletconnect', name: 'WalletConnect', chain: 'evm', badge: 'W', color: '#3b99fc', demoOnly: true },
]
