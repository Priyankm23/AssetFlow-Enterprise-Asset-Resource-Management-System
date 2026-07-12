import { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, AlertTriangle, Search, Check, Clock, ArrowRight, User as UserIcon, Building2 } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '../lib/apiClient';
import type { Asset, User, Department, AllocationRecord, TransferRequest } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { AssetTag } from '../components/ui/AssetTag';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import type { Route } from '../lib/router';

export function AllocationScreen({ params, onNavigate }: { params: Record<string, string>; onNavigate: (r: Route, params?: Record<string, string>) => void }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(params.assetId ?? '');
  const [holderType, setHolderType] = useState<'user' | 'department'>('user');
  const [holderUserId, setHolderUserId] = useState('');
  const [holderDeptId, setHolderDeptId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [conflictState, setConflictState] = useState<{ currentHolder: { userName: string; departmentName: string } } | null>(null);
  const [transferMode, setTransferMode] = useState(false);
  const [transferToUser, setTransferToUser] = useState('');
  const [transferToDept, setTransferToDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, u, d, al, tr] = await Promise.all([
        apiGet<Asset[]>('/assets'),
        apiGet<User[]>('/users'),
        apiGet<Department[]>('/departments'),
        apiGet<AllocationRecord[]>('/allocations'),
        apiGet<TransferRequest[]>('/transfer-requests'),
      ]);
      setAssets(a);
      setUsers(u);
      setDepartments(d);
      setAllocations(al);
      setTransfers(tr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const filteredAssets = assets.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.tag.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
  });

  const handleAllocate = async () => {
    if (!selectedAssetId) return;
    setSubmitting(true);
    setConflictState(null);
    setSuccessMsg(null);
    try {
      await apiPost('/allocations', {
        assetId: selectedAssetId,
        holderUserId: holderType === 'user' ? holderUserId || undefined : undefined,
        holderDepartmentId: holderType === 'department' ? holderDeptId || undefined : undefined,
        expectedReturnDate: returnDate || undefined,
      });
      setSuccessMsg('Asset allocated successfully');
      setHolderUserId('');
      setHolderDeptId('');
      setReturnDate('');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.currentHolder) {
        setConflictState({ currentHolder: err.currentHolder as { userName: string; departmentName: string } });
      } else {
        setError(err instanceof Error ? err.message : 'Allocation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAssetId) return;
    setSubmitting(true);
    try {
      await apiPost('/transfer-requests', {
        assetId: selectedAssetId,
        requestedToUserId: transferToUser || undefined,
        requestedToDepartmentId: transferToDept || undefined,
        reason: transferReason || undefined,
      });
      setSuccessMsg('Transfer request submitted');
      setTransferMode(false);
      setTransferToUser('');
      setTransferToDept('');
      setTransferReason('');
      setConflictState(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div><PageHeader title="Allocation & Transfer" subtitle="Allocate assets and manage transfer requests" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Allocation & Transfer" /><ErrorState message={error} onRetry={load} /></div>;

  const activeAllocations = allocations.filter((a) => a.status === 'active' || a.status === 'overdue');

  return (
    <div>
      <PageHeader title="Allocation & Transfer" subtitle="Allocate assets and manage transfer requests" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Asset picker + allocation form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader title="Select Asset" subtitle="Choose an asset to allocate" />
            <CardBody>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
                />
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-1.5">
                {filteredAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAssetId(a.id); setConflictState(null); setSuccessMsg(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${selectedAssetId === a.id ? 'bg-accent-50 border border-accent-200' : 'hover:bg-canvas-100 border border-transparent'}`}
                  >
                    <div>
                      <AssetTag tag={a.tag} />
                      <div className="text-xs text-ink-600 mt-1">{a.name}</div>
                    </div>
                    <StatusBadge status={a.status} size="sm" />
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Allocation / Transfer form */}
          {selectedAsset && (
            <Card>
              <CardHeader
                title={transferMode ? "Transfer Request" : "Allocate Asset"}
                subtitle={`${selectedAsset.tag} — ${selectedAsset.name}`}
                action={
                  <button
                    onClick={() => { setTransferMode(!transferMode); setConflictState(null); setSuccessMsg(null); }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${transferMode ? 'bg-accent-50 text-accent-600' : 'text-ink-400 hover:text-ink-600'}`}
                  >
                    {transferMode ? 'Allocation' : 'Transfer'}
                  </button>
                }
              />
              <CardBody className="space-y-3.5">
                {successMsg && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-availableSoft text-status-available text-xs animate-slideUp">
                    <Check className="w-3.5 h-3.5" />{successMsg}
                  </div>
                )}

                {/* Conflict state — the core 409 flow */}
                {conflictState && (
                  <div className="rounded-xl2 border border-status-lost/30 bg-status-lostSoft/40 p-4 animate-slideUp">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-status-lostSoft flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-status-lost" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-status-lost">Already allocated</div>
                        <div className="text-xs text-status-lost/80 mt-0.5">
                          Currently held by <span className="font-medium">{conflictState.currentHolder.userName}</span> ({conflictState.currentHolder.departmentName})
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-status-lost/20">
                      <div className="text-xs text-ink-500 mb-2">Direct re-allocation is blocked. Initiate a transfer request instead:</div>
                      <Button size="sm" variant="danger" onClick={() => setTransferMode(true)} className="w-full">
                        <ArrowRight className="w-3.5 h-3.5" /> Create Transfer Request
                      </Button>
                    </div>
                  </div>
                )}

                {/* Allocation form */}
                {!transferMode && !conflictState && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHolderType('user')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${holderType === 'user' ? 'bg-ink-800 text-white' : 'bg-canvas-200 text-ink-500 hover:bg-canvas-300'}`}
                      >
                        <UserIcon className="w-3.5 h-3.5" /> To Person
                      </button>
                      <button
                        onClick={() => setHolderType('department')}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-all ${holderType === 'department' ? 'bg-ink-800 text-white' : 'bg-canvas-200 text-ink-500 hover:bg-canvas-300'}`}
                      >
                        <Building2 className="w-3.5 h-3.5" /> To Department
                      </button>
                    </div>
                    {holderType === 'user' ? (
                      <Select label="Holder" value={holderUserId} onChange={(e) => setHolderUserId(e.target.value)}>
                        <option value="">Select person</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.departmentName}</option>)}
                      </Select>
                    ) : (
                      <Select label="Department" value={holderDeptId} onChange={(e) => setHolderDeptId(e.target.value)}>
                        <option value="">Select department</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </Select>
                    )}
                    <Input label="Expected Return Date" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                    <Button size="md" loading={submitting} onClick={handleAllocate} className="w-full">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Allocate Asset
                    </Button>
                  </>
                )}

                {/* Transfer form */}
                {transferMode && (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas-100 text-xs text-ink-500">
                      <span>From:</span>
                      <span className="font-medium text-ink-700">{selectedAsset.currentHolder?.userName ?? 'Current holder'}</span>
                    </div>
                    <Select label="Transfer To (Person)" value={transferToUser} onChange={(e) => setTransferToUser(e.target.value)}>
                      <option value="">Select person</option>
                      {users.filter((u) => u.id !== selectedAsset.currentHolder?.userId).map((u) => <option key={u.id} value={u.id}>{u.name} — {u.departmentName}</option>)}
                    </Select>
                    <div className="text-center text-xs text-ink-300">— or —</div>
                    <Select label="Transfer To (Department)" value={transferToDept} onChange={(e) => setTransferToDept(e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                    <Textarea label="Reason" rows={2} value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Why is this transfer needed?" />
                    <Button size="md" loading={submitting} onClick={handleTransfer} className="w-full">
                      <ArrowRight className="w-3.5 h-3.5" /> Submit Transfer Request
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Right: Active allocations + transfer requests */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active Allocations */}
          <Card>
            <CardHeader title="Active Allocations" subtitle={`${activeAllocations.length} assets currently allocated`} />
            <CardBody className="!px-0 !py-0">
              {activeAllocations.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No active allocations" description="Allocated assets will appear here" />
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Tag</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Asset</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Holder</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Expected Return</th>
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-canvas-400/40">
                      {activeAllocations.map((al) => (
                        <tr key={al.id} className="hover:bg-canvas-100/40 transition-colors cursor-pointer" onClick={() => onNavigate('asset-detail', { id: al.assetId })}>
                          <td className="px-5 py-3"><AssetTag tag={al.assetTag} /></td>
                          <td className="px-5 py-3 font-medium text-ink-700">{al.assetName}</td>
                          <td className="px-5 py-3 text-ink-600">{al.holderUserName} · {al.holderDepartmentName}</td>
                          <td className="px-5 py-3 text-ink-500">{al.expectedReturnDate ?? '—'}</td>
                          <td className="px-5 py-3">
                            {al.status === 'overdue' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-status-lostSoft text-status-lost">
                                <Clock className="w-3 h-3" /> Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-status-allocatedSoft text-status-allocated">
                                <span className="w-1.5 h-1.5 rounded-full bg-status-allocated" /> Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Transfer Requests */}
          <Card>
            <CardHeader title="Transfer Requests" subtitle={`${transfers.filter((t) => t.status === 'pending').length} pending`} />
            <CardBody className="!px-0 !py-0">
              {transfers.length === 0 ? (
                <EmptyState icon={ArrowRight} title="No transfer requests" description="Transfer requests will appear here" />
              ) : (
                <div className="divide-y divide-canvas-400/50">
                  {transfers.map((tr) => (
                    <div key={tr.id} className="px-5 py-3.5 hover:bg-canvas-100/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AssetTag tag={tr.assetTag} />
                          <span className="text-sm font-medium text-ink-700">{tr.assetName}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          tr.status === 'pending' ? 'bg-status-reservedSoft text-status-reserved' :
                          tr.status === 'approved' ? 'bg-status-availableSoft text-status-available' :
                          'bg-status-lostSoft text-status-lost'
                        }`}>
                          {tr.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-ink-500">
                        <span className="font-medium text-ink-600">{tr.fromUserName}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-medium text-ink-600">{tr.requestedToUserName ?? tr.requestedToDepartmentName}</span>
                      </div>
                      {tr.reason && <div className="text-xs text-ink-400 mt-1.5">{tr.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
