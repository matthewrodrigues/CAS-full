import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './i18n'
import './index.css'
import { router } from './router'

// The server pushes changes over the WebSocket, so cached reads only refetch when told to,
// or when the tab comes back into focus or the network returns (docs/SPEC.md section 5).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: true, refetchOnReconnect: true } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
