import React, { useEffect, useState, useCallback } from 'react';
import { Package, Plus, MapPin, Clock, Wrench, ArrowLeftRight, FileText } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../lib/apiClient';
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
  const [newAsset, setNewAsset] = useState<{
    name: string;
    categoryId: string;
    serialNumber: string;
    condition: string;
    location: string;
    isBookable: boolean;
    acquisitionDate: string;
    acquisitionCost: string;
    photo: File | null;
  }>({
    name: '',
    categoryId: '',
    serialNumber: '',
    condition: 'Good',
    location: '',
    isBookable: false,
    acquisitionDate: '',
    acquisitionCost: '',
    photo: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aData, cData, dData] = await Promise.all([
        apiGet<{ assets: Asset[] }>('/assets'),
        apiGet<{ categories: Category[] }>('/categories'),
        apiGet<{ departments: Department[] }>('/departments'),
      ]);
      setAssets(aData.assets);
      setCategories(cData.categories);
      setDepartments(dData.departments);
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
    if (filterStatus && a.status.replace(/\s+/g, '').toLowerCase() !== filterStatus.replace(/\s+/g, '').toLowerCase()) return false;
    if (filterDept && a.departmentId !== filterDept) return false;
    if (filterLocation && !(a.location ?? '').includes(filterLocation)) return false;
    return true;
  });

  const summary = {
    available: assets.filter((a) => a.status === 'Available').length,
    allocated: assets.filter((a) => a.status === 'Allocated').length,
    maintenance: assets.filter((a) => a.status.replace(/\s+/g, '').toLowerCase() === 'undermaintenance').length,
    retired: assets.filter((a) => a.status === 'Retired' || a.status === 'Disposed').length,
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newAsset.name);
      formData.append('categoryId', newAsset.categoryId);
      if (newAsset.serialNumber) formData.append('serialNumber', newAsset.serialNumber);
      formData.append('condition', newAsset.condition);
      if (newAsset.location) formData.append('location', newAsset.location);
      formData.append('isBookable', String(newAsset.isBookable));
      if (newAsset.acquisitionDate) formData.append('acquisitionDate', newAsset.acquisitionDate);
      if (newAsset.acquisitionCost) formData.append('acquisitionCost', newAsset.acquisitionCost);
      if (newAsset.photo) {
        formData.append('photo', newAsset.photo);
      }

      await apiPost('/assets', formData);
      setModalOpen(false);
      setNewAsset({
        name: '',
        categoryId: '',
        serialNumber: '',
        condition: 'Good',
        location: '',
        isBookable: false,
        acquisitionDate: '',
        acquisitionCost: '',
        photo: null,
      });
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
          <Input label="Acquisition Date" type="date" value={newAsset.acquisitionDate} onChange={(e) => setNewAsset({ ...newAsset, acquisitionDate: e.target.value })} />
          <Input label="Acquisition Cost (₹)" type="number" value={newAsset.acquisitionCost} onChange={(e) => setNewAsset({ ...newAsset, acquisitionCost: e.target.value })} placeholder="e.g. 85000" />
          <div className="col-span-2">
            <label className="text-xs font-medium text-ink-600 block mb-1.5">Asset Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setNewAsset({ ...newAsset, photo: e.target.files?.[0] || null })} className="w-full text-xs text-ink-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 cursor-pointer" />
          </div>
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
  const { hasRole } = useAuth();
  const canManage = hasRole('Admin', 'AssetManager');

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; condition: string; location: string; isBookable: boolean; acquisitionDate: string; acquisitionCost: string; photo: File | null }>({
    name: '',
    condition: 'Good',
    location: '',
    isBookable: false,
    acquisitionDate: '',
    acquisitionCost: '',
    photo: null,
  });
  const [activeTab, setActiveTab] = useState<'allocation' | 'maintenance'>('allocation');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ asset: Asset }>(`/assets/${params.id}`);
      setAsset(res.asset);
      setEditForm({
        name: res.asset.name,
        condition: res.asset.condition,
        location: res.asset.location ?? '',
        isBookable: res.asset.isBookable,
        acquisitionDate: res.asset.acquisitionDate ?? '',
        acquisitionCost: res.asset.acquisitionCost ? String(res.asset.acquisitionCost) : '',
        photo: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!asset) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('condition', editForm.condition);
      if (editForm.location) formData.append('location', editForm.location);
      formData.append('isBookable', String(editForm.isBookable));
      if (editForm.acquisitionDate) formData.append('acquisitionDate', editForm.acquisitionDate);
      if (editForm.acquisitionCost) formData.append('acquisitionCost', editForm.acquisitionCost);
      if (editForm.photo) formData.append('photo', editForm.photo);

      await apiPut(`/assets/${asset.id}`, formData);
      setEditOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update asset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div><PageHeader title="Asset Details" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Asset Details" /><ErrorState message={error} onRetry={load} /></div>;
  if (!asset) return null;

  const allocHistory = asset.allocationHistory ?? [];
  const maintHistory = asset.maintenanceHistory ?? [];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => onNavigate('assets')} className="text-ink-400 hover:text-ink-600 transition-colors text-sm flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Assets
        </button>
        <span className="text-ink-300">/</span>
        <AssetTag tag={asset.tag} />
      </div>

      <PageHeader title={asset.name} subtitle={`${asset.categoryName} · ${asset.condition} condition`}>
        {canManage && (
          <>
            <Button size="sm" variant="subtle" onClick={() => setEditOpen(true)}>
              <FileText className="w-3.5 h-3.5" /> Edit Asset
            </Button>
            <Button size="sm" onClick={() => onNavigate('allocation', { assetId: asset.id })}>
              <ArrowLeftRight className="w-3.5 h-3.5" /> Allocate
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Asset Info Card ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="px-5 py-4">
              {/* Header row: tag + badge */}
              <div className="flex items-center justify-between mb-4">
                <AssetTag tag={asset.tag} className="!text-base !px-2.5 !py-1" />
                <StatusBadge status={asset.status} />
              </div>

              {/* Photo */}
              {asset.photoUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border border-canvas-400 bg-canvas-100 aspect-video flex items-center justify-center">
                  <img src={asset.photoUrl} alt={asset.name} className="object-cover w-full h-full" />
                </div>
              )}

              {/* Details */}
              <div className="space-y-3">
                <DetailRow label="Serial Number" value={asset.serialNumber ?? '—'} mono />
                <DetailRow label="Category" value={asset.categoryName} />
                <DetailRow label="Condition" value={asset.condition} />
                <DetailRow label="Department" value={asset.departmentName ?? '—'} />
                <DetailRow label="Location" value={asset.location ?? '—'} icon={<MapPin className="w-3 h-3" />} />
                <DetailRow label="Bookable" value={asset.isBookable ? 'Yes — Shared Resource' : 'No'} />
                {asset.acquisitionDate && <DetailRow label="Acquisition Date" value={new Date(asset.acquisitionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />}
                {asset.acquisitionCost != null && <DetailRow label="Acquisition Cost" value={`₹${Number(asset.acquisitionCost).toLocaleString('en-IN')}`} />}
              </div>

              {/* Current Holder */}
              {asset.currentHolder && (
                <div className="mt-4 pt-4 border-t border-canvas-400/60">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Current Holder</p>
                  <div className="flex items-center gap-2.5 bg-canvas-100 rounded-lg px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 text-xs font-bold shrink-0">
                      {asset.currentHolder.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-700">{asset.currentHolder.userName}</p>
                      <p className="text-xs text-ink-400">{asset.currentHolder.departmentName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: History Tabs ── */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tab strip */}
            <div className="flex border-b border-canvas-400/60">
              <button
                onClick={() => setActiveTab('allocation')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'allocation' ? 'border-accent-500 text-accent-600' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Allocation History
                {allocHistory.length > 0 && (
                  <span className="ml-1 bg-accent-100 text-accent-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{allocHistory.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'maintenance' ? 'border-accent-500 text-accent-600' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Maintenance History
                {maintHistory.length > 0 && (
                  <span className="ml-1 bg-status-maintenanceSoft text-status-maintenance text-xs font-semibold px-1.5 py-0.5 rounded-full">{maintHistory.length}</span>
                )}
              </button>
            </div>

            {/* Allocation tab */}
            {activeTab === 'allocation' && (
              <div className="px-5 py-4">
                {allocHistory.length === 0 ? (
                  <EmptyState icon={ArrowLeftRight} title="No allocations yet" description="Allocation events will appear here as the asset is assigned to users or departments." />
                ) : (
                  <AllocationTimeline records={allocHistory} />
                )}
              </div>
            )}

            {/* Maintenance tab */}
            {activeTab === 'maintenance' && (
              <div className="px-5 py-4">
                {maintHistory.length === 0 ? (
                  <EmptyState icon={Wrench} title="No maintenance records" description="Maintenance events will appear here when requests are raised for this asset." />
                ) : (
                  <MaintenanceTimeline records={maintHistory} />
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Asset Modal */}
      {canManage && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Asset"
          subtitle={`Update details for ${asset.tag}`}
          size="lg"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={handleSave}>Save Changes</Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2">
              <Input label="Asset Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <Select label="Condition" value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}>
              {['New', 'Good', 'Fair', 'Poor'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="Location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="e.g. Floor 3 — Desk 12" />
            <Input label="Acquisition Date" type="date" value={editForm.acquisitionDate} onChange={(e) => setEditForm({ ...editForm, acquisitionDate: e.target.value })} />
            <Input label="Acquisition Cost (₹)" type="number" value={editForm.acquisitionCost} onChange={(e) => setEditForm({ ...editForm, acquisitionCost: e.target.value })} placeholder="e.g. 85000" />
            <div className="col-span-2">
              <label className="text-xs font-medium text-ink-600 block mb-1.5">Replace Photo</label>
              <input type="file" accept="image/*" onChange={(e) => setEditForm({ ...editForm, photo: e.target.files?.[0] || null })} className="w-full text-xs text-ink-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 cursor-pointer" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={editForm.isBookable} onChange={(e) => setEditForm({ ...editForm, isBookable: e.target.checked })} className="w-4 h-4 rounded accent-accent-500" />
                <span className="text-sm text-ink-700">This asset can be booked as a shared resource</span>
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Allocation History Timeline ──
function AllocationTimeline({ records }: { records: Asset['allocationHistory'] }) {
  if (!records) return null;
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-canvas-400/60" />
      {records.map((al) => {
        const isActive = al.status === 'active';
        const isOverdue = al.status === 'overdue';
        const label = al.returnedAt
          ? `Returned by ${al.holderUserName ?? 'Unknown'}`
          : `Allocated to ${al.holderUserName ?? 'Unknown'}`;
        const dotClass = isActive
          ? 'bg-status-allocatedSoft text-status-allocated'
          : isOverdue
          ? 'bg-red-100 text-red-500'
          : 'bg-status-availableSoft text-status-available';
        return (
          <div key={al.id} className="relative flex gap-3 pb-5 last:pb-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white ${dotClass}`}>
              {al.returnedAt ? <Package className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-700">{label}</p>
                  {al.holderDepartmentName && <p className="text-xs text-ink-400 mt-0.5">{al.holderDepartmentName}</p>}
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${dotClass}`}>
                  {isOverdue ? 'Overdue' : isActive ? 'Active' : 'Returned'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Allocated: {new Date(al.allocatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {al.returnedAt && <span>· Returned: {new Date(al.returnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </div>
              {al.returnConditionNotes && (
                <div className="mt-2 text-xs text-ink-500 bg-canvas-100 rounded-lg px-2.5 py-1.5 border border-canvas-400/40">
                  <span className="font-medium text-ink-600">Return notes: </span>{al.returnConditionNotes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Maintenance History Timeline ──
function MaintenanceTimeline({ records }: { records: Asset['maintenanceHistory'] }) {
  if (!records) return null;
  const priorityColor: Record<string, string> = {
    Critical: 'bg-red-100 text-red-600',
    High: 'bg-orange-100 text-orange-600',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-canvas-200 text-ink-500',
  };
  const statusColor: Record<string, string> = {
    Resolved: 'bg-status-availableSoft text-status-available',
    Pending: 'bg-yellow-50 text-yellow-700',
    Approved: 'bg-accent-50 text-accent-700',
    'In Progress': 'bg-status-maintenanceSoft text-status-maintenance',
    'Technician Assigned': 'bg-blue-50 text-blue-700',
  };
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-canvas-400/60" />
      {records.map((m) => {
        const pClass = priorityColor[m.priority] ?? 'bg-canvas-200 text-ink-500';
        const sClass = statusColor[m.status] ?? 'bg-canvas-200 text-ink-500';
        return (
          <div key={m.id} className="relative flex gap-3 pb-5 last:pb-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white bg-status-maintenanceSoft text-status-maintenance`}>
              <Wrench className="w-3 h-3" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink-700">{m.issueDescription}</p>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sClass}`}>{m.status}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pClass}`}>{m.priority} Priority</span>
                <span className="text-xs text-ink-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {m.resolutionNotes && (
                <div className="mt-2 text-xs text-ink-500 bg-canvas-100 rounded-lg px-2.5 py-1.5 border border-canvas-400/40">
                  <span className="font-medium text-ink-600">Resolution: </span>{m.resolutionNotes}
                </div>
              )}
            </div>
          </div>
        );
      })}
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

