import { createBrowserRouter } from 'react-router'
import { Landing } from './routes/landing'
import { NotFound } from './routes/not-found'
import { DisplayPage } from './routes/host/display-page'
import { HostHome } from './routes/host/host-home'
import { HostPage } from './routes/host/host-page'
import { LeaderboardPage } from './routes/play/leaderboard-page'
import { PlayLayout } from './routes/play/play-layout'
import { PlayScreen } from './routes/play/play-screen'
import { RewardsPage } from './routes/play/rewards-page'
import { PrivacyPage } from './routes/privacy-page'
import { CodesPage, NewsletterPage, RedeemPage, SettingsPage, StaffPage } from './routes/staff/staff-page'

// Route groups from docs/SPEC.md section 3. The player's tabs are nested under /play/:joinCode.
export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    path: '/play/:joinCode',
    element: <PlayLayout />,
    children: [
      { index: true, element: <PlayScreen /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'rewards', element: <RewardsPage /> },
    ],
  },
  { path: '/host', element: <HostHome /> },
  { path: '/host/:eventId', element: <HostPage /> },
  { path: '/host/:eventId/display', element: <DisplayPage /> },
  {
    path: '/staff',
    element: <StaffPage />,
    children: [
      { index: true, element: <RedeemPage /> },
      { path: 'redeem', element: <RedeemPage /> },
      { path: 'codes', element: <CodesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'newsletter', element: <NewsletterPage /> },
    ],
  },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '*', element: <NotFound /> },
])
