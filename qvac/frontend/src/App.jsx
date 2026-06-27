import React from 'react'
import { SafePrivyProvider } from './privy-context.jsx'
import WikiPage from './pages/WikiPage'

function App() {
  return (
    <SafePrivyProvider>
      <WikiPage />
    </SafePrivyProvider>
  )
}

export default App