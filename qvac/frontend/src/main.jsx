import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import ErrorBoundary from './ErrorBoundary.jsx'
import App from './App.jsx'
import './index.css'

const PRIVY_APP_ID = 'cmqu05m41000h0djl70k738mx'

const isNative = typeof window !== 'undefined' && (window.Capacitor || window.__TAURI__ || window.__bridgeFetch)

function Root() {
  const [PrivyProvider, setPrivyProvider] = useState(null)
  const [privyError, setPrivyError] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('@privy-io/react-auth')
      .then(mod => {
        if (!cancelled) setPrivyProvider(() => mod.PrivyProvider)
      })
      .catch(e => {
        console.warn('Privy not available, running without auth:', e.message)
        if (!cancelled) setPrivyError(true)
      })
    return () => { cancelled = true }
  }, [])

  if (privyError) {
    return <App />
  }

  if (!PrivyProvider) {
    return (
      <div style={{ background: '#0a0a14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#7a7468', fontSize: 14 }}>Loading Chimera...</div>
      </div>
    )
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          createWalletOnLogin: true,
          requireUserPasswordOnCreate: false,
        },
        ...(isNative ? {
          supportedChains: [],
          defaultChain: undefined,
        } : {}),
      }}
    >
      <App />
    </PrivyProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
)
