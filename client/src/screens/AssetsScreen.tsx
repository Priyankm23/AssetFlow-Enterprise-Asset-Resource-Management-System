import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, MapPin, X, Clock, Wrench, ArrowLeftRight, FileText } from 'lucide-react';
import { apiGet, apiPost } from '../lib/apiClient';
import type { Asset, Category, Department, AssetStatus } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchBar, FilterSelect } from '../components/ui/Filters';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AssetTag } from '../components/ui/AssetTag';
import { KpiCard } from '../components/ui/KpiCard';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../lib/auth';
import type { Route } from '../lib/router';

const conditions = ['New', 'Good', 'Fair', 'Poor'];

export function AssetsScreen({ onNavigate }: { onNavigate: (r: Route, params?: Record<string, string>) => void }) {
  const { hasRole } = useAuth();
  const canCreate = hasRole('Admin', 'AssetManager');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', categoryId: '', serialNumber: '', condition: 'Good', location: '', isBookable: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, c, d] = await Promise.all([
        apiGet<Asset[]>('/assets'),
        apiGet<Category[]>('/categories'),
        apiGet<Department[]>('/departments'),
      ]);
      setAssets(a);
      setCategories(c);
      setDepartments(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter((a) => {
    if (search) {
      const s = search.toLowerCase();
      if (!a.tag.toLowerCase().includes(s) && !a.name.toLowerCase().includes(s) && !(a.serialNumber ?? '').toLowerCase().includes(s)) return false;
    }
    if (filterCategory && a.categoryId !== filterCategory) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterDept && a.departmentId !== filterDept) return false;
    if (filterLocation && !(a.location ?? '').includes(filterLocation)) return false;
    return true;
  });

  const summary = {
    available: assets.filter((a) => a.status === 'Available').length,
    allocated: assets.filter((a) => a.status === 'Allocated').length,
    maintenance: assets.filter((a) => a.status === 'Under Maintenance').length,
    retired: assets.filter((a) => a.status === 'Retired' || a.status === 'Disposed').length,
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiPost('/assets', newAsset);
      setModalOpen(false);
      setNewAsset({ name: '', categoryId: '', serialNumber: '', condition: 'Good', location: '', isBookable: false });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create asset');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div><PageHeader title="Asset Registry" subtitle="Browse and manage all physical assets" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Asset Registry" /><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div>
      <PageHeader title="Asset Registry" subtitle="Browse and manage all physical assets">
        {canCreate && <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Register Asset</Button>}
      </PageHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Available" value={summary.available} icon={<Package className="w-3.5 h-3.5" />} color="available" />
        <KpiCard label="Allocated" value={summary.allocated} icon={<ArrowLeftRight className="w-3.5 h-3.5" />} color="allocated" />
        <KpiCard label="Under Maintenance" value={summary.maintenance} icon={<Wrench className="w-3.5 h-3.5" />} color="maintenance" />
        <KpiCard label="Retired/Disposed" value={summary.retired} icon={<Clock className="w-3.5 h-3.5" />} color="neutral" />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by tag, serial, or QR code..." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={(['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'] as AssetStatus[]).map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Department" value={filterDept} onChange={setFilterDept} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <FilterSelect label="Location" value={filterLocation} onChange={setFilterLocation} options={[...new Set(assets.map((a) => a.location).filter(Boolean))].map((l) => ({ value: l!, label: l! }))} />
        </div>
      </div>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={assets.length === 0 ? "No assets registered yet" : "No assets match your filters"}
            description={assets.length === 0 ? "Register your first asset to get started" : "Try adjusting your search or filters"}
            action={assets.length === 0 && canCreate ? <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Register Asset</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Tag</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Department</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-400/40">
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => onNavigate('asset-detail', { id: a.id })}
                    className="hover:bg-canvas-100/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3"><AssetTag tag={a.tag} /></td>
                    <td className="px-5 py-3 font-medium text-ink-700">{a.name}</td>
                    <td className="px-5 py-3 text-ink-500">{a.categoryName}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 text-ink-600">{a.departmentName ?? '—'}</td>
                    <td className="px-5 py-3 text-ink-500">{a.location ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Register Asset Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Asset"
        subtitle="Add a new physical asset to the registry"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" loading={creating} onClick={handleCreate}>Register Asset</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3.5">
          <div className="col-span-2">
            <Input label="Asset Name" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="e.g. Dell Latitude 5440" />
          </div>
          <Select label="Category" value={newAsset.categoryId} onChange={(e) => setNewAsset({ ...newAsset, categoryId: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Serial Number" value={newAsset.serialNumber} onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })} placeholder="e.g. DL5440-22X91" />
          <Select label="Condition" value={newAsset.condition} onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}>
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Location" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} placeholder="e.g. Floor 3 — Desk 12" />
          <div className="col-span-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={newAsset.isBookable} onChange={(e) => setNewAsset({ ...newAsset, isBookable: e.target.checked })} className="w-4 h-4 rounded accent-accent-500" />
              <span className="text-sm text-ink-700">This asset can be booked as a shared resource</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---- Asset Detail Screen ----
export function AssetDetailScreen({ params, onNavigate }: { params: Record<string, string>; onNavigate: (r: Route, params?: Record<string, string>) => void }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const a = await apiGet<Asset>(`/assets/${params.id}`);
      setAsset(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div><PageHeader title="Asset Details" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Asset Details" /><ErrorState message={error} onRetry={load} /></div>;
  if (!asset) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => onNavigate('assets')} className="text-ink-400 hover:text-ink-600 transition-colors text-sm flex items-center gap-1">
          <X className="w-3.5 h-3.5 rotate-45" /> Assets
        </button>
        <span className="text-ink-300">/</span>
        <AssetTag tag={asset.tag} />
      </div>

      <PageHeader title={asset.name} subtitle={`${asset.categoryName} · ${asset.condition} condition`}>
        <Button size="sm" variant="subtle" onClick={() => onNavigate('allocation', { assetId: asset.id })}><ArrowLeftRight className="w-3.5 h-3.5" /> Allocate</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Asset Info */}
        <div className="lg:col-span-1">
          <Card>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-4">
                <AssetTag tag={asset.tag} className="!text-base !px-2.5 !py-1" />
                <StatusBadge status={asset.status} />
              </div>
              <div className="space-y-3">
                <DetailRow label="Serial Number" value={asset.serialNumber ?? '—'} mono />
                <DetailRow label="Category" value={asset.categoryName} />
                <DetailRow label="Department" value={asset.departmentName ?? '—'} />
                <DetailRow label="Location" value={asset.location ?? '—'} icon={<MapPin className="w-3 h-3" />} />
                <DetailRow label="Acquisition Date" value={asset.acquisitionDate ?? '—'} />
                <DetailRow label="Acquisition Cost" value={asset.acquisitionCost ? `$${asset.acquisitionCost.toLocaleString()}` : '—'} />
                <DetailRow label="Bookable" value={asset.isBookable ? 'Yes' : 'No'} />
                {asset.currentHolder && <DetailRow label="Current Holder" value={`${asset.currentHolder.userName} (${asset.currentHolder.departmentName})`} />}
              </div>
            </div>
          </Card>
        </div>

        {/* History Timeline */}
        <div className="lg:col-span-2 space-y-5">
          {asset.allocationHistory && asset.allocationHistory.length > 0 && (
            <Card>
              <div className="px-5 py-3.5 border-b border-canvas-400/60">
                <h3 className="text-sm font-semibold text-ink-800 flex items-center gap-2"><ArrowLeftRight className="w-3.5 h-3.5 text-ink-400" /> Allocation History</h3>
              </div>
              <div className="px-5 py-4">
                <Timeline items={asset.allocationHistory.map((al) => ({
                  id: al.id,
                  title: al.returnedAt ? `Returned by ${al.holderUserName}` : `Allocated to ${al.holderUserName}`,
                  subtitle: al.holderDepartmentName ?? '',
                  date: al.returnedAt ?? al.allocatedAt,
                  tag: al.assetTag,
                  notes: al.returnConditionNotes,
                  icon: al.returnedAt ? 'return' : 'allocate',
                }))} />
              </div>
            </Card>
          )}

          {asset.maintenanceHistory && asset.maintenanceHistory.length > 0 && (
            <Card>
              <div className="px-5 py-3.5 border-b border-canvas-400/60">
                <h3 className="text-sm font-semibold text-ink-800 flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-ink-400" /> Maintenance History</h3>
              </div>
              <div className="px-5 py-4">
                <Timeline items={asset.maintenanceHistory.map((m) => ({
                  id: m.id,
                  title: m.issueDescription,
                  subtitle: `${m.priority} priority · ${m.status}`,
                  date: m.createdAt,
                  tag: m.assetTag,
                  notes: m.resolutionNotes,
                  icon: 'maintenance',
                }))} />
              </div>
            </Card>
          )}

          {(!asset.allocationHistory || asset.allocationHistory.length === 0) && (!asset.maintenanceHistory || asset.maintenanceHistory.length === 0) && (
            <Card>
              <EmptyState icon={FileText} title="No history yet" description="Allocation and maintenance events will appear here as they occur" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-400 text-xs">{label}</span>
      <span className={`text-ink-700 font-medium flex items-center gap-1 ${mono ? 'tag-mono' : ''}`}>
        {icon}{value}
      </span>
    </div>
  );
}

function Timeline({ items }: { items: { id: string; title: string; subtitle: string; date: string; tag?: string; notes?: string; icon: string }[] }) {
  const iconMap: Record<string, { bg: string; icon: typeof ArrowLeftRight }> = {
    allocate: { bg: 'bg-status-allocatedSoft text-status-allocated', icon: ArrowLeftRight },
    return: { bg: 'bg-status-availableSoft text-status-available', icon: Package },
    maintenance: { bg: 'bg-status-maintenanceSoft text-status-maintenance', icon: Wrench },
  };
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-canvas-400" />
      {items.map((item) => {
        const c = iconMap[item.icon] ?? iconMap.allocate;
        const Icon = c.icon;
        return (
          <div key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white ${c.bg}`}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-sm text-ink-700 font-medium">{item.title}</div>
              <div className="text-xs text-ink-400 mt-0.5">{item.subtitle}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-ink-300">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {item.tag && <AssetTag tag={item.tag} />}
              </div>
              {item.notes && <div className="text-xs text-ink-500 mt-1.5 bg-canvas-100 rounded-lg px-2.5 py-1.5">{item.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
