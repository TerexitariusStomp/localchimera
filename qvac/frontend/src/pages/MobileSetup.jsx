import { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, Wifi, Copy, Check, Zap, AlertTriangle } from 'lucide-react';

const ANDROID_SCRIPT = `pkg update -y
pkg install nodejs git -y
termux-setup-storage
cd ~
if [ ! -d "qvac-chimera" ]; then
  git clone https://github.com/TerexitariusStomp/qvac-chimera.git
fi
cd qvac-chimera/qvac
npm install
cd frontend && npm install && npm run build && cd ..
export MACHINE_OWNER_EVM=0xYOUR_ADDRESS
export APP_ID=protocol-default
node src/index.js`;

export function MobileSetup() {
  const [platform, setPlatform] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) setPlatform('android');
    else if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios');
    else setPlatform('other');
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(ANDROID_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (platform === 'ios') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-cyan-400/10 flex items-center justify-center mx-auto mb-4">
            <Cpu size={24} className="text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">iOS — Local Inference via Core ML</h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            The iOS app bundles a Core ML model and runs inference inside the app sandbox.
            It cannot join the P2P network or run the full QVAC node, but it can serve inference
            to other apps on the same device via a local HTTP endpoint.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-black/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={14} className="text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">What works</span>
            </div>
            <ul className="text-white/30 text-xs space-y-2 list-disc pl-4">
              <li>Load and run Core ML models (TinyLlama, Phi, Mistral — converted to .mlmodelc)</li>
              <li>Expose inference via local HTTP endpoint on localhost</li>
              <li>Apple Neural Engine acceleration on A12+ devices</li>
              <li>Sandboxed execution inside the iOS app container</li>
            </ul>
          </div>

          <div className="rounded-xl border border-white/8 bg-black/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">What does not work</span>
            </div>
            <ul className="text-white/30 text-xs space-y-2 list-disc pl-4">
              <li>P2P networking (Hyperswarm, DHT, UDP hole punching blocked by iOS)</li>
              <li>Background execution (app gets suspended after ~30 seconds)</li>
              <li>Full QVAC node (Node.js, native modules, file system APIs)</li>
            </ul>
          </div>

          <div className="rounded-xl border border-green-400/10 bg-green-400/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-green-400" />
              <span className="text-green-300 text-sm font-medium">How to add a model</span>
            </div>
            <p className="text-white/30 text-xs leading-relaxed mb-2">
              1. Convert your model to Core ML using coremltools or mlc-llm
            </p>
            <pre className="text-[10px] text-green-400 font-mono bg-black/40 p-2 rounded overflow-x-auto">
{`pip install coremltools
# Convert ONNX -> Core ML
ct.converters.convert(onnx_model, source="onnx", outputs=["my_model.mlpackage"])`}
            </pre>
            <p className="text-white/30 text-xs leading-relaxed mt-2">
              2. Add the .mlpackage to the Xcode project under <strong className="text-white/50">ios/App/App/Models/</strong>
            </p>
            <p className="text-white/30 text-xs leading-relaxed mt-1">
              3. Call <code className="text-cyan-400">OnnxInference.loadModel({ modelPath: "my_model" })</code> from the app
            </p>
          </div>

          <div className="rounded-xl border border-purple-400/10 bg-purple-400/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={14} className="text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Remote monitor</span>
            </div>
            <p className="text-white/30 text-xs leading-relaxed">
              For full QVAC functionality (P2P sync, mining, multi-network support), run the desktop node
              and use this iOS app to monitor status when on the same WiFi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'other') {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Open this page on your phone</h2>
        <p className="text-white/40 text-sm">
          Platform-specific setup instructions appear automatically for Android and iOS.
        </p>
      </div>
    );
  }

  // Android
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-xl bg-green-400/10 flex items-center justify-center mx-auto mb-4">
          <Shield size={24} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Android — Full QVAC in Hardened Container</h2>
        <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
          Termux provides a real Linux container (PID namespace, filesystem isolation, no root).
          Inside it, you run the full Node.js stack with native modules, P2P networking, and local inference.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/8 bg-black/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 text-xs font-bold flex items-center justify-center">1</span>
            <span className="text-white font-medium text-sm">Install Termux</span>
          </div>
          <p className="text-white/30 text-xs pl-9">
            Download from <a href="https://f-droid.org/en/packages/com.termux/" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">F-Droid</a>.
            The Play Store version is outdated. Termux is a hardened Linux container with its own userspace.
          </p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 text-xs font-bold flex items-center justify-center">2</span>
            <span className="text-white font-medium text-sm">Copy the setup script</span>
          </div>
          <div className="relative mt-2">
            <pre className="text-[11px] text-green-400 font-mono whitespace-pre-wrap bg-black/50 p-3 rounded overflow-x-auto leading-relaxed">
{ANDROID_SCRIPT}
            </pre>
            <button
              onClick={copy}
              className="absolute top-2 right-2 px-2 py-1 rounded bg-white/10 text-white/60 text-xs hover:bg-white/15 transition-colors flex items-center gap-1"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 text-xs font-bold flex items-center justify-center">3</span>
            <span className="text-white font-medium text-sm">Paste & run in Termux</span>
          </div>
          <p className="text-white/30 text-xs pl-9">
            Long-press in Termux to paste, then press Enter. First run takes 5-10 minutes to compile native modules.
          </p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 text-xs font-bold flex items-center justify-center">4</span>
            <span className="text-white font-medium text-sm">Open the app</span>
          </div>
          <p className="text-white/30 text-xs pl-9">
            Open <strong className="text-white/60">http://localhost:3002</strong> in your browser.
            The node runs inside Termux's hardened container, isolated from Android.
          </p>
        </div>
      </div>
    </div>
  );
}
