import React, { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import AIWriter from './pages/AIWriter'

function App() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('landing')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status')
        const json = await res.json()
        if (json.success) setStatus(json.data)
      } catch (e) {
        setError(e.message)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  if (view === 'landing') {
    return (
      <Landing
        onNavigateToDashboard={() => setView('status')}
        onNavigateToMiner={() => setView('status')}
        onNavigateToAIWriter={() => setView('aiwriter')}
      />
    )
  }

  if (view === 'aiwriter') {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
        <button
          onClick={() => setView('landing')}
          style={{ margin: 24, padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}
        >
          ← Back to Landing
        </button>
        <AIWriter />
      </div>
    )
  }

  const miners = status?.mining?.minerStatus || {}

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      <button
        onClick={() => setView('landing')}
        style={{ marginBottom: 24, padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}
      >
        ← Back to Landing
      </button>

      <h1 style={{ marginBottom: 8 }}>QVAC-Chimera Miner Node</h1>
      {error && <p style={{ color: '#f87171' }}>API Error: {error}</p>}
      {!status && <p style={{ color: '#9ca3af' }}>Loading status...</p>}

      {status && (
        <>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>
            Running: {status.running ? 'YES' : 'NO'} | Node: {status.nodeId?.slice(0, 8)}... | Mode: {status.mode?.currentMode}
          </p>

          <h2 style={{ color: '#60a5fa', marginTop: 24, marginBottom: 12 }}>Active Miners</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Protocol</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Mode</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(miners).map(([name, m]) => (
                <tr key={name} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{name}</td>
                  <td style={{ padding: '8px 12px', color: m.running ? '#4ade80' : '#f87171' }}>
                    {m.running ? 'RUNNING' : 'STOPPED'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{m.mode || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export default App