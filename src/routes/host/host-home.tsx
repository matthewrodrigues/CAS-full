import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { RoleGate } from '@/components/role-gate'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

/** /host: pick the night to run. */
export function HostHome() {
  return (
    <RoleGate role="host">
      <EventList />
    </RoleGate>
  )
}

function EventList() {
  const { t } = useTranslation()
  const events = useQuery({ queryKey: ['host-events'], queryFn: api.hostEvents })
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('host.eventsTitle')}</h1>
      {events.data?.events.length === 0 ? <p className="text-lg text-ink-muted">{t('host.noEvents')}</p> : null}
      <ul className="flex flex-col gap-3" aria-label={t('host.events')}>
        {events.data?.events.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-4 rounded-lg bg-surface p-4">
            <span className="text-lg text-ink">{t('host.eventRow', { code: event.join_code, theme: event.theme, phase: event.phase })}</span>
            <Button asChild variant="outline">
              <Link to={`/host/${event.id}`}>{t('host.open', { code: event.join_code })}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </main>
  )
}
