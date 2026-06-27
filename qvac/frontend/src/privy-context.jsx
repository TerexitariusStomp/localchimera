import React from 'react'
import { usePrivy } from '@privy-io/react-auth'

// Safe wrapper that provides Privy values via context, or fallback if Privy is unavailable
const SafePrivyContext = React.createContext(null)

export function SafePrivyProvider({ children }) {
  let privy = null
  try {
    privy = usePrivy()
  } catch (e) {
    // PrivyProvider not in tree — provide fallback
  }
  return React.createElement(SafePrivyContext.Provider, { value: privy }, children)
}

export function usePrivySafe() {
  const ctx = React.useContext(SafePrivyContext)
  if (ctx) return ctx
  // Fallback when Privy is not available
  return {
    authenticated: false,
    login: () => { console.warn('Privy not available') },
    logout: () => {},
    user: null,
  }
}
