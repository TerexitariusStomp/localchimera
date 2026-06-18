import { useState, useEffect } from 'react';
import { Terminal, Shield, AlertTriangle, Copy, Check, Cpu, Wifi } from 'lucide-react';

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
          <div className="w-14 h-14 rounded-xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">iOS cannot run containers</h2>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            Apple blocks Docker, chroot, user namespaces, and raw UDP sockets. 
            The iOS app sandbox is itself a hardened container, but you cannot nest containers inside it.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-black/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">What iOS can do</span>
            </div>
            <ul className="text-white/30 text-xs space-y-2 list-disc pl-4">
              <li>Run inference via Core ML or ONNX Runtime Mobile (small models only)</li>
              <li>Act as a remote dashboard for a desktop node on the same WiFi</li>
              <li>Connect to a cloud-hosted node via WebSocket</li>
            </ul>
            <p className="text-white/20 text-xs mt-3">
              Full P2P networking (DHT, UDP hole punching, Hyperswarm) is structurally impossible on iOS due to background execution limits and network restrictions.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={14} className="text-cyan-400" />
              <span className="text-cyan-300 text-sm font-medium">Recommended: remote dashboard</span>
            </div>
            <p className="text-white/30 text-xs leading-relaxed">
              Run the node on your Mac or a home server. When on the same network, open 
              <strong className="text-white/50"> http://&lt;desktop-ip&gt;:3002 </strong> 
              from your iPhone to monitor earnings, start/stop mining, and use the wiki.
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
        <h2 className="text-2xl font-bold text-white mb-3">Android — Hardened Container Setup</h2>
        <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
          Termux provides a real Linux container (PID namespace, filesystem isolation, no root required). 
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
            The Play Store version is outdated and broken. Termux is a hardened Linux container with its own package manager and userspace.
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
            Long-press in Termux to paste, then press Enter. First run takes 5-10 minutes to compile native modules (hypercore, hyperswarm, leveldb). Termux's container environment handles all compilation automatically.
          </p>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/30 p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 text-xs font-bold flex items-center justify-center">4</span>
            <span className="text-white font-medium text-sm">Open the app</span>
          </div>
          <p className="text-white/30 text-xs pl-9">
            Once running, open <strong className="text-white/60">http://localhost:3002</strong> in your browser. 
            The node is running inside Termux's hardened container — isolated from the rest of Android.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-cyan-400" />
            <span className="text-cyan-300 text-xs font-medium">Inference</span>
          </div>
          <p className="text-white/30 text-xs leading-relaxed">
            Runs on CPU via ONNX Runtime or llama.cpp. GPU acceleration is limited on mobile — expect 2-8 tokens/sec for 7B models.
          </p>
        </div>
        <div className="rounded-xl border border-purple-400/10 bg-purple-400/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={14} className="text-purple-400" />
            <span className="text-purple-300 text-xs font-medium">Container</span>
          </div>
          <p className="text-white/30 text-xs leading-relaxed">
            Termux uses the Linux kernel but provides its own isolated userspace. No root required. Processes, files, and network are sandboxed from Android.
          </p>
        </div>
      </div>
    </div>
  );
}
