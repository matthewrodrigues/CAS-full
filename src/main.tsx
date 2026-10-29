import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@fontsource-variable/figtree/wght.css'
import '@fontsource-variable/fraunces/opsz.css'
import './i18n'
import './index.css'
import { router } from './router'

// The server pushes changes over the WebSocket, so cached reads only refetch when told to,
// or when the tab comes back into focus or the network returns (docs/SPEC.md section 5).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: true, refetchOnReconnect: true },
    // Offline, React Query would hold an answer silently until the network returns; the player
    // must be told at once instead (docs/SPEC.md section 7: clear status on every play screen).
    mutations: { networkMode: 'always' },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
