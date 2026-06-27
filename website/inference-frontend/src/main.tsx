import React from 'react'
import ReactDOM from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App'
import './index.css'

const PRIVY_APP_ID = 'cmqu05m41000h0djl70k738mx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['google', 'email', 'wallet'],
        embeddedWallets: {
          createWalletOnLogin: true,
          requireUserPasswordOnCreate: false,
        },
        appearance: {
          loginMethods: ['google', 'email', 'wallet'],
        },
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
)
