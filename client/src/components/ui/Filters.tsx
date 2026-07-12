import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
      />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-ink-400 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
      >
        <option value="">All {label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Badge({ children, color = 'neutral' }: { children: ReactNode; color?: 'neutral' | 'accent' | 'available' | 'reserved' | 'lost' | 'allocated' }) {
  const map = {
    neutral: 'bg-ink-50 text-ink-600 border-ink-100',
    accent: 'bg-accent-50 text-accent-700 border-accent-100',
    available: 'bg-status-availableSoft text-status-available border-status-available/20',
    reserved: 'bg-status-reservedSoft text-status-reserved border-status-reserved/20',
    lost: 'bg-status-lostSoft text-status-lost border-status-lost/20',
    allocated: 'bg-status-allocatedSoft text-status-allocated border-status-allocated/20',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${map[color]}`}>{children}</span>;
}
