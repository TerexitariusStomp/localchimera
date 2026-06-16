import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Cpu, HardDrive, Battery, Wifi, Wallet, Play, Square, Settings,
  ChevronRight, CheckCircle, AlertCircle, Server, Zap, Activity,
  Smartphone, Download, RefreshCw, ArrowLeft, Eye, EyeOff
} from 'lucide-react'
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities'
import { useMinerState } from '../hooks/useMinerState'
import { detectLocalAI, getModelRecommendation } from '../utils/localAIDetection'

// --- Setup Wizard Steps ---

function DeviceDetectionStep({ capabilities, recommendedModel, onNext }) {
  if (!capabilities) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-400" />
        <p className="text-gray-400">Analyzing device capabilities...</p>
      </div>
    )
  }

  const memory = typeof capabilities.memory === 'number' ? `${capabilities.memory} GB` : 'Unknown'
  const cores = typeof capabilities.cores === 'number' ? `${capabilities.cores} cores` : 'Unknown'
  const storage = capabilities.storage
    ? `${Math.round(capabilities.storage.available / 1024 / 1024 / 1024)} GB free`
    : 'Unknown'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Device Analysis</h2>
      <p className="text-sm text-gray-400 text-center">We detected your device specs to recommend the best model.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Cpu className="w-6 h-6 text-primary-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-white">{cores}</div>
          <div className="text-xs text-gray-400">CPU</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <HardDrive className="w-6 h-6 text-green-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-white">{memory}</div>
          <div className="text-xs text-gray-400">RAM</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Smartphone className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-white">{storage}</div>
          <div className="text-xs text-gray-400">Storage</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-white">{capabilities.webgpu ? 'Yes' : 'No'}</div>
          <div className="text-xs text-gray-400">WebGPU</div>
        </div>
      </div>

      {recommendedModel && recommendedModel.backend !== 'HTTP' && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-primary-400 mb-1">Recommended Model</h3>
          <p className="text-white font-medium">{recommendedModel.name}</p>
          <p className="text-xs text-gray-400 mt-1">{recommendedModel.description}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{recommendedModel.size}</span>
            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{recommendedModel.backend}</span>
          </div>
        </div>
      )}

      {recommendedModel && recommendedModel.backend === 'HTTP' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 mb-1" />
          <p className="text-sm text-yellow-300">Your device has limited resources. We recommend connecting to a backend node for mining.</p>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all"
      >
        Continue <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function WalletSetupStep({ walletAddress, onSetWallet, onNext, onBack }) {
  const [address, setAddress] = useState(walletAddress || '')
  const [error, setError] = useState('')

  const validate = (addr) => {
    if (!addr) return 'Wallet address is required'
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return 'Invalid EVM address (must be 0x + 40 hex chars)'
    return ''
  }

  const handleContinue = () => {
    const err = validate(address)
    if (err) {
      setError(err)
      return
    }
    onSetWallet(address)
    onNext()
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-xl font-bold text-white text-center">Connect Wallet</h2>
      <p className="text-sm text-gray-400 text-center">Enter your EVM wallet address to receive mining rewards.</p>

      <div className="space-y-3">
        <label className="block text-sm text-gray-300 font-medium">EVM Wallet Address</label>
        <div className="relative">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError('') }}
            placeholder="0x..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Where to find your address?</h3>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Open MetaMask, Trust Wallet, or any EVM wallet</li>
          <li>Copy the address starting with 0x</li>
          <li>Paste it above</li>
        </ul>
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all"
      >
        Continue <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

function BackendSetupStep({ backendUrl, localAIEndpoint, onSetBackend, onSetLocalAI, onNext, onBack }) {
  const [url, setUrl] = useState(backendUrl || 'http://localhost:3000')
  const [localAI, setLocalAI] = useState(localAIEndpoint || '')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [localAIFound, setLocalAIFound] = useState([])

  const checkBackend = async () => {
    setChecking(true)
    setCheckResult(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${url}/api/status`, { signal: controller.signal })
      clearTimeout(timeout)
      if (response.ok) {
        const data = await response.json()
        setCheckResult({ ok: true, data })
      } else {
        setCheckResult({ ok: false, error: `HTTP ${response.status}` })
      }
    } catch (err) {
      setCheckResult({ ok: false, error: err.message })
    } finally {
      setChecking(false)
    }
  }

  const scanLocalAI = async () => {
    setChecking(true)
    const found = await detectLocalAI()
    setLocalAIFound(found)
    setChecking(false)
  }

  const handleContinue = () => {
    onSetBackend(url)
    onSetLocalAI(localAI)
    onNext()
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-xl font-bold text-white text-center">Configure Node</h2>
      <p className="text-sm text-gray-400 text-center">Connect to your miner node or local AI.</p>

      <div className="space-y-3">
        <label className="block text-sm text-gray-300 font-medium">Backend Node URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={checkBackend}
            disabled={checking}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
          >
            {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test'}
          </button>
        </div>
        {checkResult && (
          <div className={`text-sm flex items-center gap-1 ${checkResult.ok ? 'text-green-400' : 'text-red-400'}`}>
            {checkResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {checkResult.ok
              ? `Connected! Node ID: ${checkResult.data?.data?.nodeId?.substring(0, 8) || 'unknown'}`
              : checkResult.error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm text-gray-300 font-medium">Local AI Endpoint (optional)</label>
          <button onClick={scanLocalAI} disabled={checking} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} /> Scan
          </button>
        </div>
        <input
          type="text"
          value={localAI}
          onChange={(e) => setLocalAI(e.target.value)}
          placeholder="http://localhost:11434 (Ollama)"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
        {localAIFound.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm text-green-300 font-medium mb-1">Found local AI:</p>
            {localAIFound.map((ai, i) => (
              <button
                key={i}
                onClick={() => setLocalAI(ai.url)}
                className="block text-xs text-green-400 hover:text-green-300 underline mb-0.5"
              >
                {ai.name} at {ai.url}
              </button>
            ))}
          </div>
        )}
        {localAIFound.length === 0 && !checking && (
          <p className="text-xs text-gray-500">No local AI detected. You can enter a URL manually or skip this step.</p>
        )}
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all"
      >
        Finish Setup <CheckCircle className="w-5 h-5" />
      </button>
    </div>
  )
}

// --- Mining Dashboard ---

function MiningDashboard({ minerState, capabilities, onOpenSettings }) {
  const [nodeStatus, setNodeStatus] = useState(null)
  const [connectionError, setConnectionError] = useState(null)
  const [lastTask, setLastTask] = useState(null)
  const intervalRef = useRef(null)

  const fetchStatus = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${minerState.backendUrl}/api/status`, { signal: controller.signal })
      clearTimeout(timeout)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setNodeStatus(result.data)
          setConnectionError(null)
        }
      } else {
        setConnectionError(`HTTP ${response.status}`)
      }
    } catch (err) {
      setConnectionError('Offline')
    }
  }, [minerState.backendUrl])

  useEffect(() => {
    if (minerState.isMining) {
      fetchStatus()
      intervalRef.current = setInterval(fetchStatus, 5000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [minerState.isMining, fetchStatus])

  const handleStart = async () => {
    minerState.startMining()
    try {
      await fetch(`${minerState.backendUrl}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: minerState.walletAddress,
          model: minerState.selectedModel?.id,
          localAI: minerState.localAIEndpoint
        })
      })
    } catch {
      // Backend may not support this endpoint yet
    }
  }

  const handleStop = async () => {
    minerState.stopMining()
    try {
      await fetch(`${minerState.backendUrl}/api/stop`, { method: 'POST' })
    } catch {
      // Backend may not support this endpoint yet
    }
  }

  const connected = !connectionError && nodeStatus
  const isRunning = minerState.isMining && connected && nodeStatus?.running

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pear Miner</h1>
          <p className="text-xs text-gray-400">{minerState.walletAddress.slice(0, 6)}...{minerState.walletAddress.slice(-4)}</p>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Control */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${
          isRunning
            ? 'bg-green-500/20 border-2 border-green-500 animate-pulse'
            : 'bg-gray-700 border-2 border-gray-600'
        }`}>
          {isRunning ? (
            <Activity className="w-10 h-10 text-green-400" />
          ) : (
            <Server className="w-10 h-10 text-gray-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
          {isRunning ? 'Mining Active' : 'Mining Stopped'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {isRunning
            ? 'Processing inference tasks and earning rewards'
            : connectionError
              ? `Cannot reach backend: ${connectionError}`
              : 'Ready to start mining'}
        </p>

        {isRunning ? (
          <button
            onClick={handleStop}
            className="w-full py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl font-bold text-red-400 flex items-center justify-center gap-2 transition-all"
          >
            <Square className="w-5 h-5" /> Stop Mining
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-5 h-5" /> Start Mining
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Total Earned</span>
          </div>
          <div className="text-xl font-bold text-white">{minerState.earnings.total.toFixed(4)}</div>
          <div className="text-xs text-gray-500">tokens</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Tasks Done</span>
          </div>
          <div className="text-xl font-bold text-white">{minerState.earnings.tasksCompleted}</div>
          <div className="text-xs text-gray-500">completed</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-gray-400">Device</span>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {capabilities?.memory}GB RAM
          </div>
          <div className="text-xs text-gray-500">{capabilities?.cores} cores</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Model</span>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {minerState.selectedModel?.name || 'Backend Node'}
          </div>
          <div className="text-xs text-gray-500">{minerState.selectedModel?.size || 'Remote'}</div>
        </div>
      </div>

      {/* Backend Status */}
      {nodeStatus && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Backend Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Node</span>
              <span className={nodeStatus.running ? 'text-green-400' : 'text-red-400'}>
                {nodeStatus.running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Miners</span>
              <span className="text-white">{nodeStatus.mining?.availableMiners?.length || 0} active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Peers</span>
              <span className="text-white">{nodeStatus.p2p?.peerCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tasks</span>
              <span className="text-white">{nodeStatus.tasks?.activeTasks || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Local AI Status */}
      {minerState.localAIEndpoint && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Local AI</h3>
          <div className="flex items-center gap-2 text-sm">
            <Server className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 truncate">{minerState.localAIEndpoint}</span>
          </div>
        </div>
      )}

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300 font-medium">Backend Unreachable</p>
            <p className="text-xs text-red-400 mt-1">
              Cannot connect to {minerState.backendUrl}. Make sure your node is running, or update the backend URL in settings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Settings Panel ---

function SettingsPanel({ minerState, onClose }) {
  const [wallet, setWallet] = useState(minerState.walletAddress)
  const [backend, setBackend] = useState(minerState.backendUrl)
  const [localAI, setLocalAI] = useState(minerState.localAIEndpoint)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    minerState.setWalletAddress(wallet)
    minerState.setBackendUrl(backend)
    minerState.setLocalAIEndpoint(localAI)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (confirm('Reset all miner settings? This will clear your wallet and earnings data.')) {
      minerState.clearConfig()
      window.location.reload()
    }
  }

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Close</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 font-medium mb-1">Wallet Address</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 font-medium mb-1">Backend URL</label>
          <input
            type="text"
            value={backend}
            onChange={(e) => setBackend(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 font-medium mb-1">Local AI Endpoint</label>
          <input
            type="text"
            value={localAI}
            onChange={(e) => setLocalAI(e.target.value)}
            placeholder="http://localhost:11434"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg font-semibold text-white transition-all"
      >
        {saved ? 'Saved!' : 'Save Changes'}
      </button>

      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={handleReset}
          className="w-full py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  )
}

// --- Main Component ---

export default function MobileMinerConsole() {
  const minerState = useMinerState()
  const { capabilities, loading: deviceLoading, getRecommendedModel, getDeviceClass } = useDeviceCapabilities()
  const [step, setStep] = useState(minerState.setupComplete ? 'dashboard' : 'device')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!minerState.setupComplete && capabilities && step === 'device') {
      // Auto-advance recommended model
      const rec = getRecommendedModel()
      if (rec && rec.backend !== 'HTTP') {
        minerState.setSelectedModel({
          id: rec.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: rec.name,
          size: rec.size,
          backend: rec.backend
        })
      }
      minerState.setDeviceProfile({
        class: getDeviceClass(),
        memory: capabilities.memory,
        cores: capabilities.cores,
        webgpu: capabilities.webgpu
      })
    }
  }, [capabilities, minerState, step, getRecommendedModel, getDeviceClass])

  const steps = ['device', 'wallet', 'backend', 'dashboard']
  const currentStepIndex = steps.indexOf(step)

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
        <SettingsPanel minerState={minerState} onClose={() => setShowSettings(false)} />
      </div>
    )
  }

  if (step === 'dashboard' || minerState.setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
        <MiningDashboard
          minerState={minerState}
          capabilities={capabilities}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {steps.slice(0, 3).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= currentStepIndex ? 'bg-primary-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {step === 'device' && (
        <DeviceDetectionStep
          capabilities={capabilities}
          recommendedModel={getRecommendedModel()}
          onNext={() => setStep('wallet')}
        />
      )}

      {step === 'wallet' && (
        <WalletSetupStep
          walletAddress={minerState.walletAddress}
          onSetWallet={minerState.setWalletAddress}
          onNext={() => setStep('backend')}
          onBack={() => setStep('device')}
        />
      )}

      {step === 'backend' && (
        <BackendSetupStep
          backendUrl={minerState.backendUrl}
          localAIEndpoint={minerState.localAIEndpoint}
          onSetBackend={minerState.setBackendUrl}
          onSetLocalAI={minerState.setLocalAIEndpoint}
          onNext={() => { minerState.setSetupComplete(true); setStep('dashboard') }}
          onBack={() => setStep('wallet')}
        />
      )}
    </div>
  )
}
