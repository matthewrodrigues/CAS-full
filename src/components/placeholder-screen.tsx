import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Stand-in layout for screens that don't have a design in design/screens/ yet. */
export function PlaceholderScreen({ title, children }: { title: string; children?: ReactNode }) {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold">{title}</h1>
      {children}
      <p className="text-sm text-muted-foreground">{t('app.placeholder')}</p>
    </main>
  )
}
