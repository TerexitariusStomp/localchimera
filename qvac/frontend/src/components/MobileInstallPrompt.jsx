import { useState, useEffect } from 'react';
import { Smartphone, ArrowRight } from 'lucide-react';

export function MobileInstallPrompt() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (!isMobile) return null;

  return (
    <a
      href="#mobile-setup"
      className="block rounded-xl border border-amber-400/15 bg-amber-400/5 p-5 transition-all hover:border-amber-400/25"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
          <Smartphone size={18} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">Running on mobile?</h3>
          <p className="text-white/30 text-xs mt-0.5">
            Android supports local inference via Termux. iOS is remote-monitor only.
          </p>
        </div>
        <ArrowRight size={16} className="text-amber-400/40" />
      </div>
    </a>
  );
}
