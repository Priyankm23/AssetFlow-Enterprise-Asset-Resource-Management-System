import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  color?: 'available' | 'allocated' | 'reserved' | 'lost' | 'maintenance' | 'neutral';
  onClick?: () => void;
}

const colorMap = {
  available: { bar: 'bg-status-available', icon: 'text-status-available', iconBg: 'bg-status-availableSoft' },
  allocated: { bar: 'bg-status-allocated', icon: 'text-status-allocated', iconBg: 'bg-status-allocatedSoft' },
  reserved: { bar: 'bg-status-reserved', icon: 'text-status-reserved', iconBg: 'bg-status-reservedSoft' },
  lost: { bar: 'bg-status-lost', icon: 'text-status-lost', iconBg: 'bg-status-lostSoft' },
  maintenance: { bar: 'bg-status-maintenance', icon: 'text-status-maintenance', iconBg: 'bg-status-maintenanceSoft' },
  neutral: { bar: 'bg-ink-300', icon: 'text-ink-500', iconBg: 'bg-ink-50' },
};

export function KpiCard({ label, value, icon, color = 'neutral', onClick }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl2 border border-canvas-400/60 shadow-card overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-elevated transition-shadow' : ''}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
      <div className="px-4 py-3.5 pl-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-400">{label}</span>
          {icon && <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.iconBg} ${c.icon}`}>{icon}</span>}
        </div>
        <div className="text-2xl font-semibold text-ink-800 mt-1.5 tabular-nums">{value}</div>
      </div>
    </div>
  );
}
