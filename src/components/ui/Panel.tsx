import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  children: ReactNode
  /** small extra content next to the title, e.g. a count */
  aside?: ReactNode
  /** scroll the body instead of growing the panel */
  scroll?: boolean
  /** fill the remaining space of a flex column (default) or size to content */
  grow?: boolean
}

export default function Panel({ title, children, aside, scroll, grow = true }: PanelProps) {
  return (
    <section
      className={`relative flex min-h-0 flex-col border-2 border-[var(--surface)] bg-[var(--surface)]/30 p-4 ${grow ? 'flex-1' : 'shrink-0'}`}
      style={{ fontFamily: 'var(--font-data)' }}
    >
      <span className="panel-corner corner-tl" />
      <span className="panel-corner corner-tr" />
      <span className="panel-corner corner-bl" />
      <span className="panel-corner corner-br" />

      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[10px] tracking-widest text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        {aside}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col ${scroll ? 'overflow-y-auto pr-1' : ''}`}>{children}</div>
    </section>
  )
}
