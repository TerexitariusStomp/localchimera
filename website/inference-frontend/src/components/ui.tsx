import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.015] text-card-foreground transition-all hover:border-white/[0.12] hover:bg-white/[0.03] hover:-translate-y-0.5', className)}>{children}</div>;
}

export function Button({ children, onClick, disabled, variant = 'primary', className, type = 'button' }: any) {
  const variants: any = {
    primary: 'bg-gradient-to-br from-[#00e5ff] to-[#a855f7] text-black font-semibold hover:opacity-90',
    secondary: 'bg-white/[0.06] border border-white/10 text-[#e8e2d8] hover:bg-white/10',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-white/10 bg-transparent text-[#e8e2d8] hover:bg-white/5',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn('inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variants[variant], className)}>
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }: any) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </div>
  );
}

export function Badge({ children, variant = 'default' }: any) {
  const variants: any = {
    default: 'bg-primary/10 text-[#00e5ff]',
    success: 'bg-[#22c55e]/10 text-[#4ade80]',
    error: 'bg-red-500/10 text-red-400',
    warning: 'bg-yellow-500/10 text-yellow-400',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-white/5', variants[variant])}>{children}</span>;
}

export function StarRating({ value, onChange, size = 20 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110">
          <Star size={size}
            className={(hover || value) >= star ? 'fill-[#00e5ff] text-[#00e5ff]' : 'fill-none text-white/20'} />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value > 0 ? `${value}/5` : 'Not rated'}</span>
    </div>
  );
}
