import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeftRight, AlertTriangle, Search, Check, Clock,
  ArrowRight, User as UserIcon, Building2, RotateCcw, X,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, ApiError } from '../lib/apiClient';
import type { Asset, User, Department, AllocationRecord, TransferRequest } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AssetTag } from '../components/ui/AssetTag';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../lib/auth';
import type { Route } from '../lib/router';

export function AllocationScreen({
  params,
  onNavigate,
}: {
  params: Record<string, string>;
  onNavigate: (r: Route, params?: Record<string, string>) => void;
}) {
  const { user } = useAuth();
  const role = user?.role ?? '';

  // ── Data ──
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Allocate form ──
  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState(params.assetId ?? '');
  const [holderType, setHolderType] = useState<'user' | 'department'>('user');
  const [holderUserId, setHolderUserId] = useState('');
  const [holderDeptId, setHolderDeptId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [conflictState, setConflictState] = useState<{
    currentHolder: { userName: string; departmentName: string };
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Transfer request form ──
  const [transferMode, setTransferMode] = useState(false);
  const [transferToUser, setTransferToUser] = useState('');
  const [transferToDept, setTransferToDept] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // ── Return asset modal ──
  const [returnModal, setReturnModal] = useState<AllocationRecord | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // ── Active tab for right panel ──
  const [activeTab, setActiveTab] = useState<'allocations' | 'transfers'>('allocations');

  // ── Transfer request modal for employees/HODs ──
  const [transferModal, setTransferModal] = useState<AllocationRecord | null>(null);
  const [modalTransferToUser, setModalTransferToUser] = useState('');
  const [modalTransferToDept, setModalTransferToDept] = useState('');
  const [modalTransferReason, setModalTransferReason] = useState('');
  const [modalTransferSubmitting, setModalTransferSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Always fetch assets, users, departments, and transfers
      const [assetsRes, usersRes, deptsRes, transfersRes] = await Promise.all([
        apiGet<{ assets: Asset[] } | Asset[]>('/assets'),
        apiGet<{ users: User[] } | User[]>('/users'),
        apiGet<{ departments: Department[] } | Department[]>('/departments'),
        apiGet<{ transfers: TransferRequest[] }>('/transfer-requests'),
      ]);

      // Unwrap envelopes
      const assetList = Array.isArray(assetsRes) ? assetsRes : (assetsRes as any).assets ?? [];
      const userList = Array.isArray(usersRes) ? usersRes : (usersRes as any).users ?? [];
      const deptList = Array.isArray(deptsRes) ? deptsRes : (deptsRes as any).departments ?? [];
      const transferList = (transfersRes as any).transfers ?? [];

      setAssets(assetList);
      setUsers(userList);
      setDepartments(deptList);
      setTransfers(transferList);

      // Allocations visible to AssetManager, DepartmentHead, and Employee
      if (role === 'AssetManager' || role === 'DepartmentHead' || role === 'Employee') {
        const allocRes = await apiGet<{ allocations: AllocationRecord[] }>('/allocations');
        setAllocations((allocRes as any).allocations ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  // ── Computed ──
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const filteredAssets = assets.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.tag.toLowerCase().includes(s) || a.name.toLowerCase().includes(s);
  });
  // Only Available assets can be allocated
  const allocatableAssets = filteredAssets.filter((a) =>
    (a.status ?? '').toLowerCase() === 'available'
  );

  // ── Handlers ──
  const handleAllocate = async () => {
    if (!selectedAssetId) return;
    if (holderType === 'user' && !holderUserId) return;
    if (holderType === 'department' && !holderDeptId) return;
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
      setSelectedAssetId('');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && (err as any).currentHolder) {
        setConflictState({ currentHolder: (err as any).currentHolder });
      } else {
        setError(err instanceof Error ? err.message : 'Allocation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAssetId) return;
    if (!transferToUser && !transferToDept) return;
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

  const handleReturn = async () => {
    if (!returnModal) return;
    setReturnSubmitting(true);
    try {
      await apiPost(`/allocations/${returnModal.id}/return`, {
        returnConditionNotes: returnNotes || undefined,
      });
      setReturnModal(null);
      setReturnNotes('');
      setSuccessMsg('Asset returned successfully');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleApproveTransfer = async (id: string) => {
    try {
      await apiPatch(`/transfer-requests/${id}/approve`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const handleRejectTransfer = async (id: string) => {
    try {
      await apiPatch(`/transfer-requests/${id}/reject`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const handleModalTransfer = async () => {
    if (!transferModal) return;
    if (!modalTransferToUser && !modalTransferToDept) return;
    setModalTransferSubmitting(true);
    try {
      await apiPost('/transfer-requests', {
        assetId: transferModal.assetId,
        requestedToUserId: modalTransferToUser || undefined,
        requestedToDepartmentId: modalTransferToDept || undefined,
        reason: modalTransferReason || undefined,
      });
      setSuccessMsg('Transfer request submitted successfully');
      setTransferModal(null);
      setModalTransferToUser('');
      setModalTransferToDept('');
      setModalTransferReason('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer request failed');
    } finally {
      setModalTransferSubmitting(false);
    }
  };

  if (loading) return <div><PageHeader title="Allocation & Transfer" subtitle="Allocate assets and manage transfer requests" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Allocation & Transfer" /><ErrorState message={error} onRetry={load} /></div>;

  const activeAllocations = allocations.filter((a) => a.status === 'active' || a.status === 'overdue');
  const pendingTransfers = transfers.filter((t) => t.status === 'pending');

  // AssetManager sees both panels; others see only the right panel
  const canAllocate = role === 'AssetManager';
  const canApproveReject = role === 'AssetManager' || role === 'DepartmentHead';

  return (
    <div>
      <PageHeader title="Allocation & Transfer" subtitle="Allocate assets and manage transfer requests" />

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-availableSoft text-status-available text-sm font-medium border border-status-available/20 animate-slideUp">
          <Check className="w-4 h-4 shrink-0" />{successMsg}
          <button className="ml-auto text-status-available/60 hover:text-status-available" onClick={() => setSuccessMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className={`grid grid-cols-1 ${canAllocate ? 'lg:grid-cols-3' : ''} gap-5`}>

        {/* Left: Asset picker + allocation form — AssetManager only */}
        {canAllocate && (
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader title="Select Asset" subtitle="Available assets only" />
              <CardBody>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by tag or name..."
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-canvas-400 bg-white text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-1.5">
                  {allocatableAssets.length === 0 ? (
                    <p className="text-xs text-ink-400 text-center py-4">No available assets</p>
                  ) : allocatableAssets.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedAssetId(a.id); setConflictState(null); setSuccessMsg(null); setTransferMode(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${selectedAssetId === a.id ? 'bg-accent-50 border border-accent-200' : 'hover:bg-canvas-100 border border-transparent'}`}
                    >
                      <div>
                        <AssetTag tag={a.tag} />
                        <div className="text-xs text-ink-600 mt-0.5">{a.name}</div>
                      </div>
                      <StatusBadge status={a.status} size="sm" />
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Allocation form card */}
            {selectedAsset && (
              <Card>
                <CardHeader
                  title="Allocate Asset"
                  subtitle={`${selectedAsset.tag} — ${selectedAsset.name}`}
                />
                <CardBody className="space-y-3.5">

                  {/* Conflict banner */}
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
                    </div>
                  )}

                  {/* Allocation form */}
                  {!conflictState && (
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
                        <Select label="Holder Person" value={holderUserId} onChange={(e) => setHolderUserId(e.target.value)}>
                          <option value="">Select person</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {(u as any).departmentName ?? ''}</option>)}
                        </Select>
                      ) : (
                        <Select label="Holder Department" value={holderDeptId} onChange={(e) => setHolderDeptId(e.target.value)}>
                          <option value="">Select department</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                      )}
                      <Input label="Expected Return Date (optional)" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                      <Button
                        size="md"
                        loading={submitting}
                        onClick={handleAllocate}
                        className="w-full"
                        disabled={holderType === 'user' ? !holderUserId : !holderDeptId}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" /> Allocate Asset
                      </Button>
                    </>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* Right: Allocations + Transfer Requests */}
        <div className={`${canAllocate ? 'lg:col-span-2' : ''} space-y-5`}>

          {/* Tab strip */}
          <div className="flex border-b border-canvas-400/60 bg-white rounded-t-xl overflow-hidden">
            <button
              onClick={() => setActiveTab('allocations')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'allocations' ? 'border-accent-500 text-accent-600' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Active Allocations
              {activeAllocations.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">{activeAllocations.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'transfers' ? 'border-accent-500 text-accent-600' : 'border-transparent text-ink-400 hover:text-ink-600'}`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Transfer Requests
              {pendingTransfers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-status-reservedSoft text-status-reserved text-xs font-semibold">{pendingTransfers.length} pending</span>
              )}
            </button>
          </div>

          {/* Active Allocations tab */}
          {activeTab === 'allocations' && (
            <Card>
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
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-ink-500 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-canvas-400/40">
                        {activeAllocations.map((al) => (
                          <tr key={al.id} className="hover:bg-canvas-100/40 transition-colors">
                            <td className="px-5 py-3 cursor-pointer" onClick={() => onNavigate('asset-detail', { id: al.assetId })}>
                              <AssetTag tag={al.assetTag} />
                            </td>
                            <td className="px-5 py-3 font-medium text-ink-700 cursor-pointer" onClick={() => onNavigate('asset-detail', { id: al.assetId })}>
                              {al.assetName}
                            </td>
                            <td className="px-5 py-3 text-ink-600">
                              {al.holderUserName
                                ? <><span className="font-medium">{al.holderUserName}</span><span className="text-ink-400"> · {al.holderDepartmentName}</span></>
                                : <span className="font-medium">{al.holderDepartmentName}</span>
                              }
                            </td>
                            <td className="px-5 py-3 text-ink-500 text-xs">
                              {al.expectedReturnDate
                                ? new Date(al.expectedReturnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'
                              }
                            </td>
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
                            <td className="px-5 py-3 text-right">
                              {canAllocate ? (
                                <button
                                  onClick={() => { setReturnModal(al); setReturnNotes(''); }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-status-available transition-colors px-2 py-1 rounded-md hover:bg-status-availableSoft"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Return
                                </button>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setTransferModal(al);
                                      setModalTransferToUser('');
                                      setModalTransferToDept('');
                                      setModalTransferReason('');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-accent-600 transition-colors px-2 py-1 rounded-md hover:bg-accent-50"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" /> Request Transfer
                                  </button>
                                  <button
                                    onClick={() => { setReturnModal(al); setReturnNotes(''); }}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-status-available transition-colors px-2 py-1 rounded-md hover:bg-status-availableSoft"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Request Return
                                  </button>
                                </div>
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
          )}

          {/* Transfer Requests tab */}
          {activeTab === 'transfers' && (
            <Card>
              <CardBody className="!px-0 !py-0">
                {transfers.length === 0 ? (
                  <EmptyState icon={ArrowRight} title="No transfer requests" description="Transfer requests will appear here" />
                ) : (
                  <div className="divide-y divide-canvas-400/50">
                    {transfers.map((tr) => (
                      <div key={tr.id} className="px-5 py-4 hover:bg-canvas-100/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <AssetTag tag={tr.assetTag} />
                            <span className="text-sm font-medium text-ink-700">{tr.assetName}</span>
                          </div>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            tr.status === 'pending'  ? 'bg-status-reservedSoft text-status-reserved' :
                            tr.status === 'approved' ? 'bg-status-availableSoft text-status-available' :
                                                       'bg-status-lostSoft text-status-lost'
                          }`}>
                            {tr.status.charAt(0).toUpperCase() + tr.status.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-ink-500">
                          <span className="font-medium text-ink-600">{tr.fromUserName}</span>
                          <ArrowRight className="w-3 h-3 text-ink-300" />
                          <span className="font-medium text-ink-600">
                            {tr.requestedToUserName ?? tr.requestedToDepartmentName ?? '—'}
                          </span>
                        </div>

                        {tr.reason && (
                          <div className="text-xs text-ink-400 mt-1.5 bg-canvas-100 rounded-lg px-2.5 py-1.5">
                            {tr.reason}
                          </div>
                        )}

                        <div className="text-[10px] text-ink-300 mt-1.5">
                          {new Date(tr.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>

                        {/* Approve / Reject — for AssetManager and DepartmentHead on pending requests */}
                        {canApproveReject && tr.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleApproveTransfer(tr.id)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-status-availableSoft text-status-available hover:bg-status-available hover:text-white transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectTransfer(tr.id)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-status-lostSoft text-status-lost hover:bg-status-lost hover:text-white transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Return Asset Modal */}
      {returnModal && (
        <Modal
          open
          onClose={() => setReturnModal(null)}
          title="Return Asset"
          subtitle={`${returnModal.assetTag} — ${returnModal.assetName}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas-100 text-xs text-ink-600">
              <span>Holder:</span>
              <span className="font-medium">{returnModal.holderUserName ?? returnModal.holderDepartmentName ?? '—'}</span>
            </div>
            <Textarea
              label="Return Condition Notes (optional)"
              rows={3}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Describe the condition of the asset on return..."
            />
            <div className="flex gap-2 pt-1">
              <Button variant="subtle" className="flex-1" onClick={() => setReturnModal(null)}>Cancel</Button>
              <Button className="flex-1" loading={returnSubmitting} onClick={handleReturn}>
                <RotateCcw className="w-3.5 h-3.5" /> Confirm Return
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Transfer Asset Modal for Non-Managers */}
      {transferModal && (
        <Modal
          open
          onClose={() => setTransferModal(null)}
          title="Request Transfer"
          subtitle={`${transferModal.assetTag} — ${transferModal.assetName}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas-100 text-xs text-ink-500">
              <span>Current Holder:</span>
              <span className="font-medium text-ink-700">{transferModal.holderUserName ?? 'You'}</span>
            </div>
            <Select
              label="Transfer To (Person)"
              value={modalTransferToUser}
              onChange={(e) => {
                setModalTransferToUser(e.target.value);
                if (e.target.value) setModalTransferToDept('');
              }}
            >
              <option value="">Select person</option>
              {users.filter((u) => u.id !== transferModal.holderUserId).map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {(u as any).departmentName ?? ''}</option>
              ))}
            </Select>
            <div className="text-center text-xs text-ink-300">— or —</div>
            <Select
              label="Transfer To (Department)"
              value={modalTransferToDept}
              onChange={(e) => {
                setModalTransferToDept(e.target.value);
                if (e.target.value) setModalTransferToUser('');
              }}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
            <Textarea
              label="Reason"
              rows={2}
              value={modalTransferReason}
              onChange={(e) => setModalTransferReason(e.target.value)}
              placeholder="Why is this transfer needed?"
            />
            <div className="flex gap-2 pt-1">
              <Button variant="subtle" className="flex-1" onClick={() => setTransferModal(null)}>Cancel</Button>
              <Button
                className="flex-1"
                loading={modalTransferSubmitting}
                onClick={handleModalTransfer}
                disabled={!modalTransferToUser && !modalTransferToDept}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Submit Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
