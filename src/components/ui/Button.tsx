import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  small?: boolean
  danger?: boolean
  active?: boolean
  disabled?: boolean
  full?: boolean
}

export default function Button({ children, onClick, type = 'button', small, danger, active, disabled, full }: ButtonProps) {
  const size = small ? 'px-2 py-1 text-[8px]' : 'px-3 py-2 text-[10px]'
  const tone = active
    ? 'border-[var(--eye-glow)] text-[var(--active)]'
    : danger
      ? 'border-[var(--accent)] text-[var(--eye-glow)] hover:border-[var(--eye-glow)]'
      : 'border-[var(--muted)]/50 text-[var(--text)] hover:border-[var(--eye-glow)] hover:text-[var(--active)]'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`border-2 tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${size} ${tone} ${full ? 'w-full' : ''}`}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </button>
  )
}
