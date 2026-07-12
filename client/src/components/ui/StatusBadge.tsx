import type { AssetStatus } from '../../lib/types';

const statusConfig: Record<AssetStatus, { bg: string; text: string; dot: string; label: string }> = {
  Available: { bg: 'bg-status-availableSoft', text: 'text-status-available', dot: 'bg-status-available', label: 'Available' },
  Allocated: { bg: 'bg-status-allocatedSoft', text: 'text-status-allocated', dot: 'bg-status-allocated', label: 'Allocated' },
  Reserved: { bg: 'bg-status-reservedSoft', text: 'text-status-reserved', dot: 'bg-status-reserved', label: 'Reserved' },
  'Under Maintenance': { bg: 'bg-status-maintenanceSoft', text: 'text-status-maintenance', dot: 'bg-status-maintenance', label: 'Under Maintenance' },
  Lost: { bg: 'bg-status-lostSoft', text: 'text-status-lost', dot: 'bg-status-lost', label: 'Lost' },
  Retired: { bg: 'bg-status-retiredSoft', text: 'text-status-retired', dot: 'bg-status-retired', label: 'Retired' },
  Disposed: { bg: 'bg-status-retiredSoft', text: 'text-status-retired', dot: 'bg-status-retired', label: 'Disposed' },
};

export function StatusBadge({ status, size = 'md' }: { status: AssetStatus; size?: 'sm' | 'md' }) {
  const c = statusConfig[status];
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium ${c.bg} ${c.text} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function getStatusConfig(status: AssetStatus) {
  return statusConfig[status];
}
