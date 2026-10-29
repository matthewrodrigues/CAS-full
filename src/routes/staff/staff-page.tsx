import { useTranslation } from 'react-i18next'
import { PlaceholderScreen } from '@/components/placeholder-screen'
import { RoleGate } from '@/components/role-gate'

/** /staff/*: behind the staff passcode; the redeem page arrives with Milestone 6. */
export function StaffPage() {
  const { t } = useTranslation()
  return (
    <RoleGate role="staff">
      <PlaceholderScreen title={t('staff.title')}>
        <p className="text-lg">{t('staff.body')}</p>
      </PlaceholderScreen>
    </RoleGate>
  )
}
