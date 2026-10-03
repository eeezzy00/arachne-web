// Mirrors src/utils/fakeWallet.ts's English pool — the server only ever
// mints the canonical English nickname; the client may rename it later.
const NICK_PREFIX = ['WANDERER', 'OBSERVER', 'GUEST', 'SHADOW', 'SEEKER', 'HERALD']

export function generateNickname(): string {
  const prefix = NICK_PREFIX[Math.floor(Math.random() * NICK_PREFIX.length)]
  return `${prefix}-${Math.floor(10 + Math.random() * 89)}`
}
