import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  /** omit to make the modal non-dismissable (e.g. while a wallet request is pending) */
  onClose?: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto border-2 border-[var(--eye-glow)] bg-[var(--surface)] p-5 shadow-[0_0_32px_rgba(255,32,32,0.18)]"
        style={{ fontFamily: 'var(--font-data)', animation: 'modal-in 0.18s ease-out' }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xs tracking-widest text-[var(--active)]" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--muted)] transition hover:text-[var(--eye-glow)]"
              aria-label="Закрыть"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
