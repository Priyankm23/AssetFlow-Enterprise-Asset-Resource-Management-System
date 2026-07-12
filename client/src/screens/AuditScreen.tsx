import { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, Plus, AlertTriangle, Lock, CheckCircle2, XCircle, HelpCircle, FileWarning } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';
import type { AuditCycle, AuditItem, User, Department } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AssetTag } from '../components/ui/AssetTag';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../lib/auth';

const resultConfig = {
  Verified: { bg: 'bg-status-availableSoft', text: 'text-status-available', icon: CheckCircle2, label: 'Verified' },
  Missing: { bg: 'bg-status-lostSoft', text: 'text-status-lost', icon: XCircle, label: 'Missing' },
  Damaged: { bg: 'bg-status-reservedSoft', text: 'text-status-reserved', icon: FileWarning, label: 'Damaged' },
  Pending: { bg: 'bg-canvas-200', text: 'text-ink-400', icon: HelpCircle, label: 'Pending' },
};

export function AuditScreen() {
  const { hasRole } = useAuth();
  const isAuditor = hasRole('Admin', 'AssetManager');
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newCycle, setNewCycle] = useState({ scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '', auditorUserIds: '' });
  const [creating, setCreating] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cyclesRes, usersRes, deptsRes] = await Promise.all([
        apiGet<{ auditCycles: AuditCycle[] } | AuditCycle[]>('/audit-cycles'),
        apiGet<{ users: User[] } | User[]>('/users'),
        apiGet<{ departments: Department[] } | Department[]>('/departments'),
      ]);

      const cycleList = Array.isArray(cyclesRes) ? cyclesRes : (cyclesRes as any).auditCycles ?? [];
      const userList = Array.isArray(usersRes) ? usersRes : (usersRes as any).users ?? [];
      const deptList = Array.isArray(deptsRes) ? deptsRes : (deptsRes as any).departments ?? [];

      setCycles(cycleList);
      setUsers(userList);
      setDepartments(deptList);

      const active = cycleList.find((x) => x.status === 'in_progress') ?? cycleList[0];
      if (active) {
        setSelectedCycleId(active.id);
        const itemsRes = await apiGet<{ auditItems: AuditItem[] } | AuditItem[]>(`/audit-items?cycleId=${active.id}`);
        const itemList = Array.isArray(itemsRes) ? itemsRes : (itemsRes as any).auditItems ?? [];
        setItems(itemList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectCycle = async (id: string) => {
    setSelectedCycleId(id);
    try {
      const itemsRes = await apiGet<{ auditItems: AuditItem[] } | AuditItem[]>(`/audit-items?cycleId=${id}`);
      const itemList = Array.isArray(itemsRes) ? itemsRes : (itemsRes as any).auditItems ?? [];
      setItems(itemList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiPost('/audit-cycles', {
        scopeDepartmentId: newCycle.scopeDepartmentId || undefined,
        scopeLocation: newCycle.scopeLocation || undefined,
        startDate: newCycle.startDate,
        endDate: newCycle.endDate,
        auditorUserIds: newCycle.auditorUserIds.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setModalOpen(false);
      setNewCycle({ scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '', auditorUserIds: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cycle');
    } finally {
      setCreating(false);
    }
  };

  const updateItem = async (itemId: string, result: AuditItem['result']) => {
    try {
      await apiPatch(`/audit-items/${itemId}`, { result });
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, result } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const startCycle = async (id: string) => {
    try {
      await apiPatch(`/audit-cycles/${id}/start`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const closeCycle = async (id: string) => {
    try {
      await apiPatch(`/audit-cycles/${id}/close`);
      setCloseConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close');
    }
  };

  if (loading) return <div><PageHeader title="Asset Audit" subtitle="Manage audit cycles and verify assets" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Asset Audit" /><ErrorState message={error} onRetry={load} /></div>;

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);
  const discrepancies = items.filter((i) => i.result === 'Missing' || i.result === 'Damaged');
  const verifiedCount = items.filter((i) => i.result === 'Verified').length;
  const pendingCount = items.filter((i) => i.result === 'Pending').length;

  return (
    <div>
      <PageHeader title="Asset Audit" subtitle="Manage audit cycles and verify assets">
        {isAuditor && <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> New Audit Cycle</Button>}
      </PageHeader>

      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {cycles.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCycle(c.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${selectedCycleId === c.id ? 'bg-ink-800 text-white border-ink-800' : 'bg-white text-ink-600 border-canvas-400 hover:bg-canvas-100'}`}
            >
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-3.5 h-3.5" />
                {c.scopeDepartmentName ?? c.scopeLocation ?? 'All Assets'}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.status === 'in_progress' ? 'bg-status-reservedSoft text-status-reserved' : c.status === 'closed' ? 'bg-status-retiredSoft text-status-retired' : 'bg-canvas-200 text-ink-500'}`}>
                  {c.status === 'in_progress' ? 'Active' : c.status === 'closed' ? 'Closed' : 'Planned'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCycle ? (
        <>
          {/* Cycle header */}
          <Card className="mb-5">
            <CardBody>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                  <div>
                    <div className="text-xs text-ink-400 mb-0.5">Scope</div>
                    <div className="text-sm font-medium text-ink-700">{selectedCycle.scopeDepartmentName ?? selectedCycle.scopeLocation ?? 'All Assets'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400 mb-0.5">Date Range</div>
                    <div className="text-sm font-medium text-ink-700">{selectedCycle.startDate} → {selectedCycle.endDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400 mb-0.5">Auditors</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {selectedCycle.auditorNames.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas-200 text-xs text-ink-600">
                          <span className="w-4 h-4 rounded-full bg-ink-600 text-white text-[8px] flex items-center justify-center font-semibold">
                            {name.split(' ').map((n) => n[0]).join('')}
                          </span>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400 mb-0.5">Progress</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-canvas-300 rounded-full overflow-hidden">
                        <div className="h-full bg-status-available rounded-full transition-all" style={{ width: `${items.length > 0 ? (verifiedCount / items.length) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-ink-500 tabular-nums">{verifiedCount}/{items.length}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedCycle.status === 'planned' && isAuditor && (
                    <Button size="sm" onClick={() => startCycle(selectedCycle.id)}>Start Audit</Button>
                  )}
                  {selectedCycle.status === 'in_progress' && isAuditor && (
                    <Button size="sm" variant="danger" onClick={() => setCloseConfirm(selectedCycle.id)}>
                      <Lock className="w-3.5 h-3.5" /> Close Audit Cycle
                    </Button>
                  )}
                  {selectedCycle.status === 'closed' && (
                    <span className="text-xs text-status-retired flex items-center gap-1 px-3 py-1.5"><Lock className="w-3 h-3" /> Cycle locked</span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Discrepancy callout */}
          {discrepancies.length > 0 && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3.5 rounded-xl2 border border-status-lost/20 bg-status-lostSoft/40 animate-slideUp">
              <div className="w-8 h-8 rounded-lg bg-status-lostSoft flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-status-lost" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-status-lost">{discrepancies.length} asset{discrepancies.length > 1 ? 's' : ''} flagged — discrepancy report generated automatically</div>
                <div className="text-xs text-status-lost/80 mt-0.5">
                  {discrepancies.map((d) => `${d.assetTag} (${d.result})`).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Checklist table */}
          <Card>
            <CardHeader title="Verification Checklist" subtitle={`${items.length} assets to verify · ${pendingCount} pending`} />
            <CardBody className="!px-0 !py-0">
              {items.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No items in this audit cycle" description="Assets will appear here once the cycle is started" />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Asset</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Expected Location</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Verification</th>
                        {selectedCycle.status === 'in_progress' && isAuditor && (
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-canvas-400/40">
                      {items.map((item) => {
                        const cfg = resultConfig[item.result];
                        const Icon = cfg.icon;
                        return (
                          <tr key={item.id} className="hover:bg-canvas-100/40 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <AssetTag tag={item.assetTag} />
                                <span className="font-medium text-ink-700">{item.assetName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-ink-500">{item.expectedLocation}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                <Icon className="w-3 h-3" /> {cfg.label}
                              </span>
                              {item.notes && <div className="text-xs text-ink-400 mt-1">{item.notes}</div>}
                            </td>
                            {selectedCycle.status === 'in_progress' && isAuditor && (
                              <td className="px-5 py-3">
                                <div className="flex gap-1.5">
                                  <button onClick={() => updateItem(item.id, 'Verified')} className="px-2 py-1 rounded-md text-[10px] font-medium bg-status-availableSoft text-status-available hover:bg-status-available/20 transition-colors">Verify</button>
                                  <button onClick={() => updateItem(item.id, 'Missing')} className="px-2 py-1 rounded-md text-[10px] font-medium bg-status-lostSoft text-status-lost hover:bg-status-lost/20 transition-colors">Missing</button>
                                  <button onClick={() => updateItem(item.id, 'Damaged')} className="px-2 py-1 rounded-md text-[10px] font-medium bg-status-reservedSoft text-status-reserved hover:bg-status-reserved/20 transition-colors">Damaged</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="No audit cycles yet"
            description="Create your first audit cycle to start verifying assets"
            action={isAuditor && <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> New Audit Cycle</Button>}
          />
        </Card>
      )}

      {/* New Cycle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Audit Cycle"
        subtitle="Define scope and assign auditors"
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" loading={creating} onClick={handleCreate}>Create Cycle</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3.5">
          <Select label="Scope Department" value={newCycle.scopeDepartmentId} onChange={(e) => setNewCycle({ ...newCycle, scopeDepartmentId: e.target.value })}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Scope Location" value={newCycle.scopeLocation} onChange={(e) => setNewCycle({ ...newCycle, scopeLocation: e.target.value })} placeholder="e.g. Server Room A" />
          <Input label="Start Date" type="date" value={newCycle.startDate} onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={newCycle.endDate} onChange={(e) => setNewCycle({ ...newCycle, endDate: e.target.value })} />
          <div className="col-span-2">
            <Input label="Auditor User IDs (optional, comma-separated)" value={newCycle.auditorUserIds} onChange={(e) => setNewCycle({ ...newCycle, auditorUserIds: e.target.value })} placeholder="Leave blank to assign yourself as the auditor" />
            <div className="text-xs text-ink-300 mt-1">Available: {users.map((u) => `${u.id} (${u.name})`).join(', ')}</div>
          </div>
        </div>
      </Modal>

      {/* Close confirmation */}
      <Modal
        open={!!closeConfirm}
        onClose={() => setCloseConfirm(null)}
        title="Close Audit Cycle"
        subtitle="This action is irreversible — the cycle will be permanently locked"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCloseConfirm(null)}>Cancel</Button>
            <Button size="sm" variant="danger" onClick={() => closeConfirm && closeCycle(closeConfirm)}><Lock className="w-3.5 h-3.5" /> Close & Lock</Button>
          </>
        }
      >
        <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-status-lostSoft/40 border border-status-lost/20">
          <AlertTriangle className="w-5 h-5 text-status-lost shrink-0 mt-0.5" />
          <div className="text-xs text-ink-600">
            Once closed, the audit cycle cannot be reopened. All verification results will be finalized and the discrepancy report will be locked.
            {discrepancies.length > 0 && <div className="mt-1.5 font-medium text-status-lost">{discrepancies.length} discrepancies will be recorded.</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
