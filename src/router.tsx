import { createBrowserRouter } from 'react-router'
import { Landing } from './routes/landing'
import { NotFound } from './routes/not-found'
import { DisplayPage } from './routes/host/display-page'
import { HostPage } from './routes/host/host-page'
import { PlayPage } from './routes/play/play-page'
import { StaffPage } from './routes/staff/staff-page'

// Route groups from docs/SPEC.md section 3.
export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/play/:joinCode', element: <PlayPage /> },
  { path: '/host/:eventId', element: <HostPage /> },
  { path: '/host/:eventId/display', element: <DisplayPage /> },
  { path: '/staff/*', element: <StaffPage /> },
  { path: '*', element: <NotFound /> },
])
