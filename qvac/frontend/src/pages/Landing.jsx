import { useState, useEffect } from 'react'
import {
  Zap,
  Cpu,
  Network,
  Database,
  Moon,
  Sun,
  Star,
  ArrowRight,
  CheckCircle,
  Shield,
  Globe,
  Server,
  Activity,
  Clock,
  Award,
  Camera,
  Download,
  Smartphone
} from 'lucide-react'
import AIWriterExample from './AIWriterExample'

export default function Landing({ onNavigateToDashboard, onNavigateToMiner, onNavigateToAIWriter, onNavigateToWiki }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [mobileOS, setMobileOS] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const ua = navigator.userAgent
    if (/Android/i.test(ua)) setMobileOS('android')
    else if (/iPhone|iPad|iPod/i.test(ua)) setMobileOS('ios')

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Navigation */}
      <nav className="border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Chimera</h1>
                <p className="text-sm text-dark-400">Distributed AI Inference & Mining</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {installPrompt && (
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}
              {onNavigateToAIWriter && (
                <button
                  onClick={onNavigateToAIWriter}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  AI Writer
                </button>
              )}
              <button
                onClick={() => window.open('/wiki', '_blank')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Wiki
              </button>
              <a
                href="https://github.com/TerexitariusStomp/qvac-chimera"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Chimera
          </h1>
          <p className="text-xl text-dark-300 mb-8 max-w-2xl mx-auto">
            A powerful node that combines QVAC for local AI inference, Pear for P2P distribution,
            Hypercore for data storage, and multi-miner support with parallel monitoring.
          </p>
        </div>
      </section>

      {/* Mobile Download Banner */}
      {mobileOS && (
        <section className="container mx-auto px-6 pb-16">
          <div className="max-w-2xl mx-auto">
            <div className="card bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-6 h-6 text-primary-400" />
                <h2 className="text-xl font-bold text-white">
                  {mobileOS === 'android' ? 'Download Chimera Miner for Android' : 'Get Chimera Miner for iPhone'}
                </h2>
              </div>
              <p className="text-sm text-dark-300 mb-4">
                {mobileOS === 'android'
                  ? 'Install the APK directly on your Android device. No Docker required — the app runs natively and auto-configures miners.'
                  : 'Install on your iPhone. The iOS build connects directly to the mining network via Pear P2P.'}
              </p>
              <div className="flex gap-3 flex-wrap">
                {mobileOS === 'android' ? (
                  <a
                    href="./chimera-miner.apk"
                    download
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download APK
                  </a>
                ) : (
                  <a
                    href="https://testflight.apple.com/join/chimera-miner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" /> Join TestFlight
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Key Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Key Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">QVAC Integration</h3>
              <p className="text-sm text-dark-400 mb-3">
                Local AI inference layer with support for multiple models including LLaMA-2. 
                On-device processing for privacy and speed.
              </p>
              <a href="https://qvac.tether.io/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                qvac.tether.io →
              </a>
            </div>

            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <Network className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pear P2P</h3>
              <p className="text-sm text-dark-400 mb-3">
                Decentralized peer-to-peer app distribution using Pear Runtime. 
                Zero infrastructure, direct node-to-node communication.
              </p>
              <a href="https://pears.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                pears.com →
              </a>
            </div>

            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Hypercore Storage</h3>
              <p className="text-sm text-dark-400 mb-3">
                Secure, distributed append-only log for data storage. 
                Replication and integrity verification built-in.
              </p>
              <a href="https://github.com/holepunchto/hypercore" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                github.com/holepunchto/hypercore →
              </a>
            </div>

            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multi-Miner Support</h3>
              <p className="text-sm text-dark-400 mb-3">
                Run Cortensor, Chutes, Fortytwo-Network, and Earnidle miners simultaneously 
                in parallel monitoring mode.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <a href="https://docs.cortensor.network/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                  Cortensor →
                </a>
                <a href="https://chutes.ai/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                  Chutes →
                </a>
                <a href="https://fortytwo.network/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                  Fortytwo →
                </a>
                <a href="https://earnidle.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                  Earnidle →
                </a>
                <a href="https://routstr.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">
                  Routstr →
                </a>
              </div>
            </div>

            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Time-Based Scheduling</h3>
              <p className="text-sm text-dark-400">
                Automatic resource allocation between day (inference earning) and 
                night (custom applications) modes.
              </p>
            </div>

            <div className="card hover:border-primary-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Task Monitor</h3>
              <p className="text-sm text-dark-400">
                Immediate detection and notification of inference tasks across all miners.
                Smart resource management pauses earning when app needs AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Architecture
          </h2>

          <div className="card">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary-400" />
                  Core Components
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <Zap className="w-4 h-4 text-primary-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">QVAC Inference Layer</p>
                      <p className="text-xs text-dark-400">Local AI processing with multiple models</p>
                    </div>
                    <a href="https://qvac.tether.io/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <Database className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Hypercore Data Store</p>
                      <p className="text-xs text-dark-400">Distributed append-only log storage</p>
                    </div>
                    <a href="https://github.com/holepunchto/hypercore" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <Network className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Pear P2P Network</p>
                      <p className="text-xs text-dark-400">Decentralized peer discovery</p>
                    </div>
                    <a href="https://pears.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Time Scheduler</p>
                      <p className="text-xs text-dark-400">Automatic day/night mode switching</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Task Monitor</p>
                      <p className="text-xs text-dark-400">Real-time inference task detection</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  Parallel Miners
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Cortensor</p>
                      <p className="text-xs text-dark-400">Decentralized AI network mining</p>
                    </div>
                    <a href="https://docs.cortensor.network/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Chutes</p>
                      <p className="text-xs text-dark-400">GPU compute validation mining</p>
                    </div>
                    <a href="https://chutes.ai/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
                      <Activity className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Fortytwo-Network</p>
                      <p className="text-xs text-dark-400">AI inference network mining</p>
                    </div>
                    <a href="https://fortytwo.network/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                      <Award className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Earnidle</p>
                      <p className="text-xs text-dark-400">Idle compute protocol mining</p>
                    </div>
                    <a href="https://earnidle.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded flex items-center justify-center">
                      <Zap className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Routstr</p>
                      <p className="text-xs text-dark-400">Decentralized AI inference router</p>
                    </div>
                    <a href="https://routstr.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300">→</a>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <p className="text-sm text-primary-300">
                    <strong className="text-primary-400">Parallel Mode:</strong> All miners run simultaneously 
                    in monitoring mode, detecting inference tasks in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Writer Integration Section - INLINE ON LANDING PAGE */}
      <section className="container mx-auto px-6 py-16">
        <AIWriterExample onNavigateBack={() => {}} onNavigateToDashboard={onNavigateToDashboard} />
      </section>

      {/* Tech Stack Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Technology Stack
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Server className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-medium text-white">Node.js</h3>
              <p className="text-xs text-dark-400 mt-1">Runtime</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-medium text-white">QVAC</h3>
              <p className="text-xs text-dark-400 mt-1">AI Inference</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Network className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-medium text-white">Pear</h3>
              <p className="text-xs text-dark-400 mt-1">P2P Network</p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-medium text-white">Hypercore</h3>
              <p className="text-xs text-dark-400 mt-1">Data Storage</p>
            </div>
          </div>
        </div>
        </section>

      {/* Footer */}
      <footer className="border-t border-dark-700 bg-dark-800/50">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-dark-400">Chimera</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-dark-400">
              <span>Version 1.0.0</span>
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-dark-800/50 backdrop-blur-sm border border-dark-700 rounded-xl p-6 ${className}`}>
      {children}
    </div>
  )
}