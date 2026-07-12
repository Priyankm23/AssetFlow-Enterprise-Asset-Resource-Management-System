import { useEffect, useState, useCallback } from 'react';
import { Plus, Check, X, User as UserIcon, Play, CheckCircle2, Shield } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';
import type { MaintenanceRequest, Asset, Priority, MaintenanceStatus } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AssetTag } from '../components/ui/AssetTag';
import { LoadingState, ErrorState } from '../components/ui/States';
import { useAuth } from '../lib/auth';

const columns: { status: MaintenanceStatus; label: string; color: string }[] = [
  { status: 'Pending', label: 'Pending', color: 'border-t-status-reserved' },
  { status: 'Approved', label: 'Approved', color: 'border-t-status-allocated' },
  { status: 'Technician Assigned', label: 'Technician Assigned', color: 'border-t-accent-400' },
  { status: 'In Progress', label: 'In Progress', color: 'border-t-status-maintenance' },
  { status: 'Resolved', label: 'Resolved', color: 'border-t-status-available' },
];

const priorityColors: Record<Priority, string> = {
  Low: 'bg-ink-50 text-ink-500 border-ink-100',
  Medium: 'bg-status-reservedSoft text-status-reserved border-status-reserved/20',
  High: 'bg-accent-50 text-accent-700 border-accent-200',
  Critical: 'bg-status-lostSoft text-status-lost border-status-lost/20',
};

export function MaintenanceScreen() {
  const { hasRole } = useAuth();
  const isAssetManager = hasRole('Admin', 'AssetManager');
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({ assetId: '', issueDescription: '', priority: 'Medium' as Priority });
  const [creating, setCreating] = useState(false);
  const [techModal, setTechModal] = useState<string | null>(null);
  const [techName, setTechName] = useState('');
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, assetsRes] = await Promise.all([
        apiGet<{ maintenanceRequests: MaintenanceRequest[] }>('/maintenance-requests'),
        apiGet<{ assets: Asset[] } | Asset[]>('/assets'),
      ]);

      const reqList = (reqRes as any).maintenanceRequests ?? [];
      const assetList = Array.isArray(assetsRes) ? assetsRes : (assetsRes as any).assets ?? [];

      setRequests(reqList);
      setAssets(assetList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiPost('/maintenance-requests', newReq);
      setModalOpen(false);
      setNewReq({ assetId: '', issueDescription: '', priority: 'Medium' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, action: string, body?: unknown) => {
    try {
      await apiPatch(`/maintenance-requests/${id}/${action}`, body);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  if (loading) return <div><PageHeader title="Maintenance Management" subtitle="Track and manage maintenance requests" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Maintenance Management" /><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div>
      <PageHeader title="Maintenance Management" subtitle="Track and manage maintenance requests">
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Raise Request</Button>
      </PageHeader>

      {!isAssetManager && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-allocatedSoft border border-status-allocated/20">
          <Shield className="w-4 h-4 text-status-allocated" />
          <span className="text-xs text-status-allocated">You can raise maintenance requests — approval and assignment require Asset Manager role</span>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {columns.map((col) => {
          const items = requests.filter((r) => r.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-2.5">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-canvas-400/60 border-t-2 ${col.color} shadow-card`}>
                <span className="text-xs font-semibold text-ink-700">{col.label}</span>
                <span className="text-xs text-ink-400 bg-canvas-200 px-1.5 py-0.5 rounded-md tabular-nums">{items.length}</span>
              </div>
              <div className="space-y-2.5 min-h-0">
                {items.map((req) => (
                  <Card key={req.id} className="!shadow-card hover:!shadow-elevated transition-shadow">
                    <div className="px-3.5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <AssetTag tag={req.assetTag} />
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${priorityColors[req.priority]}`}>{req.priority}</span>
                      </div>
                      <div className="text-sm font-medium text-ink-700 mb-1">{req.assetName}</div>
                      {req.photoUrl && (
                        <div className="mb-2 rounded overflow-hidden max-h-32 bg-canvas-200 flex items-center justify-center border border-canvas-400/40">
                          <img src={req.photoUrl} alt={req.assetName} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="text-xs text-ink-500 leading-relaxed mb-2">{req.issueDescription}</div>
                      {req.technicianName && (
                        <div className="text-[10px] text-ink-400 flex items-center gap-1 mb-2">
                          <UserIcon className="w-2.5 h-2.5" /> {req.technicianName}
                        </div>
                      )}
                      {req.resolutionNotes && (
                        <div className="text-[10px] text-status-available bg-status-availableSoft rounded px-2 py-1 mb-2">{req.resolutionNotes}</div>
                      )}

                      {/* Actions per status */}
                      {isAssetManager && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-canvas-400/40">
                          {req.status === 'Pending' && (
                            <>
                              <Button size="sm" variant="subtle" className="!h-6 !px-2 !text-[10px]" onClick={() => updateStatus(req.id, 'approve')}><Check className="w-2.5 h-2.5" /> Approve</Button>
                              <Button size="sm" variant="ghost" className="!h-6 !px-2 !text-[10px] !text-status-lost" onClick={() => updateStatus(req.id, 'reject', { reason: 'Rejected' })}><X className="w-2.5 h-2.5" /> Reject</Button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <Button size="sm" variant="subtle" className="!h-6 !px-2 !text-[10px]" onClick={() => setTechModal(req.id)}><UserIcon className="w-2.5 h-2.5" /> Assign</Button>
                          )}
                          {req.status === 'Technician Assigned' && (
                            <Button size="sm" variant="subtle" className="!h-6 !px-2 !text-[10px]" onClick={() => updateStatus(req.id, 'start')}><Play className="w-2.5 h-2.5" /> Start</Button>
                          )}
                          {req.status === 'In Progress' && (
                            <Button size="sm" variant="subtle" className="!h-6 !px-2 !text-[10px]" onClick={() => setResolveModal(req.id)}><CheckCircle2 className="w-2.5 h-2.5" /> Resolve</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-6 text-xs text-ink-300 border border-dashed border-canvas-400 rounded-lg">No items</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Request Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Raise Maintenance Request"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" loading={creating} onClick={handleCreate}>Submit Request</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Select label="Asset" value={newReq.assetId} onChange={(e) => setNewReq({ ...newReq, assetId: e.target.value })}>
            <option value="">Select asset</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.tag} — {a.name}</option>)}
          </Select>
          <Textarea label="Issue Description" rows={3} value={newReq.issueDescription} onChange={(e) => setNewReq({ ...newReq, issueDescription: e.target.value })} placeholder="Describe the issue..." />
          <Select label="Priority" value={newReq.priority} onChange={(e) => setNewReq({ ...newReq, priority: e.target.value as Priority })}>
            {(['Low', 'Medium', 'High', 'Critical'] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
      </Modal>

      {/* Assign Technician Modal */}
      <Modal
        open={!!techModal}
        onClose={() => { setTechModal(null); setTechName(''); }}
        title="Assign Technician"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setTechModal(null); setTechName(''); }}>Cancel</Button>
            <Button size="sm" onClick={() => { if (techModal) updateStatus(techModal, 'assign-technician', { technicianName: techName }); setTechModal(null); setTechName(''); }}>Assign</Button>
          </>
        }
      >
        <Input label="Technician Name" value={techName} onChange={(e) => setTechName(e.target.value)} placeholder="e.g. Ravi Motors" />
      </Modal>

      {/* Resolve Modal */}
      <Modal
        open={!!resolveModal}
        onClose={() => { setResolveModal(null); setResolveNotes(''); }}
        title="Resolve Maintenance Request"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setResolveModal(null); setResolveNotes(''); }}>Cancel</Button>
            <Button size="sm" onClick={() => { if (resolveModal) updateStatus(resolveModal, 'resolve', { resolutionNotes: resolveNotes }); setResolveModal(null); setResolveNotes(''); }}>Resolve</Button>
          </>
        }
      >
        <Textarea label="Resolution Notes" rows={3} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="What was done to resolve the issue?" />
      </Modal>
    </div>
  );
}
