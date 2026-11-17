import type { ReactNode } from 'react'

/** The one form error (kit.md §9): Tomato text with an icon, never color alone. Render inside the field's role="alert". */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="field__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <path d="M12 16.5v.01" />
      </svg>
      <span>{children}</span>
    </p>
  )
}
