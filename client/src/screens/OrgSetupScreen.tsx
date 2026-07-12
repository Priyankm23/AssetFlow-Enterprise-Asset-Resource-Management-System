import { useEffect, useState, useCallback } from 'react';
import { Building2, Tag, Users, Plus, Shield, Check, X, ChevronDown } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '../lib/apiClient';
import type { Department, Category, User, Role } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../lib/auth';

type Tab = 'departments' | 'categories' | 'employees';

const roleColors: Record<Role, string> = {
  Admin: 'bg-status-lostSoft text-status-lost border-status-lost/20',
  AssetManager: 'bg-accent-50 text-accent-700 border-accent-200',
  DepartmentHead: 'bg-status-allocatedSoft text-status-allocated border-status-allocated/20',
  Employee: 'bg-ink-50 text-ink-500 border-ink-100',
};

const allRoles: Role[] = ['Employee', 'DepartmentHead', 'AssetManager', 'Admin'];

export function OrgSetupScreen() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');
  const [tab, setTab] = useState<Tab>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHead, setNewHead] = useState('');
  const [newParent, setNewParent] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depts, cats, usrs] = await Promise.all([
        apiGet<Department[]>('/departments'),
        apiGet<Category[]>('/categories'),
        apiGet<User[]>('/users'),
      ]);
      setDepartments(depts);
      setCategories(cats);
      setUsers(usrs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateDept = async () => {
    setCreating(true);
    try {
      await apiPost('/departments', { name: newName, headUserId: newHead || undefined, parentDepartmentId: newParent || undefined, status: 'active' });
      setModalOpen(false);
      setNewName('');
      setNewHead('');
      setNewParent('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCat = async () => {
    setCreating(true);
    try {
      await apiPost('/categories', { name: newName });
      setModalOpen(false);
      setNewName('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await apiPatch(`/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId: string, status: 'active' | 'inactive') => {
    try {
      await apiPatch(`/users/${userId}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'departments', label: 'Departments', icon: Building2 },
    { key: 'categories', label: 'Categories', icon: Tag },
    { key: 'employees', label: 'Employee', icon: Users },
  ];

  if (loading) return <div><PageHeader title="Organization Setup" subtitle="Manage departments, categories, and employees" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Organization Setup" /><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div>
      <PageHeader title="Organization Setup" subtitle="Manage departments, categories, and employees">
        {isAdmin && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> {tab === 'departments' ? 'Add Department' : tab === 'categories' ? 'Add Category' : 'Add Employee'}
          </Button>
        )}
      </PageHeader>

      {!isAdmin && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-allocatedSoft border border-status-allocated/20">
          <Shield className="w-4 h-4 text-status-allocated" />
          <span className="text-xs text-status-allocated">Read-only view — admin access required to modify organization settings</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-canvas-400/60">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 ${
                active
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-ink-400 hover:text-ink-600 hover:bg-canvas-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Departments Tab */}
      {tab === 'departments' && (
        <Card>
          {departments.length === 0 ? (
            <EmptyState icon={Building2} title="No departments yet" description="Add your first department to start organizing assets" action={isAdmin && <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Department</Button>} />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Head</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Parent Dept</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-400/40">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-canvas-100/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-ink-700">{d.name}</td>
                      <td className="px-5 py-3 text-ink-600">{d.headUserName ?? '—'}</td>
                      <td className="px-5 py-3 text-ink-500">{d.parentDepartmentName ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${d.status === 'active' ? 'bg-status-availableSoft text-status-available' : 'bg-status-retiredSoft text-status-retired'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'active' ? 'bg-status-available' : 'bg-status-retired'}`} />
                          {d.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <Card>
          {categories.length === 0 ? (
            <EmptyState icon={Tag} title="No categories yet" description="Add categories to classify your assets" action={isAdmin && <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Category</Button>} />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Custom Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-400/40">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas-100/40 transition-colors">
                      <td className="px-5 py-3 font-medium text-ink-700">{c.name}</td>
                      <td className="px-5 py-3 text-ink-400">{c.customFields?.length ?? 0} fields</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Employees Tab */}
      {tab === 'employees' && (
        <Card>
          {users.length === 0 ? (
            <EmptyState icon={Users} title="No employees yet" description="Employees will appear here once they sign up" />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Department</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-canvas-400/40">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-canvas-100/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-ink-100 flex items-center justify-center text-xs font-semibold text-ink-600">
                            {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium text-ink-700">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-500">{u.email}</td>
                      <td className="px-5 py-3 text-ink-600">{u.departmentName ?? '—'}</td>
                      <td className="px-5 py-3">
                        {isAdmin ? (
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                              className={`appearance-none pl-2.5 pr-7 py-1 rounded-md text-xs font-medium border cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-accent-400/30 ${roleColors[u.role]}`}
                            >
                              {allRoles.map((r) => (
                                <option key={r} value={r} className="bg-white text-ink-700">{r}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${roleColors[u.role]}`}>{u.role}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isAdmin ? (
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status === 'active' ? 'inactive' : 'active')}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${u.status === 'active' ? 'bg-status-availableSoft text-status-available' : 'bg-status-retiredSoft text-status-retired'}`}
                          >
                            {u.status === 'active' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {u.status === 'active' ? 'Active' : 'Inactive'}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${u.status === 'active' ? 'bg-status-availableSoft text-status-available' : 'bg-status-retiredSoft text-status-retired'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-status-available' : 'bg-status-retired'}`} />
                            {u.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Add Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={tab === 'departments' ? 'Add Department' : tab === 'categories' ? 'Add Category' : 'Add Employee'}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button size="sm" loading={creating} onClick={tab === 'departments' ? handleCreateDept : handleCreateCat}>
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={tab === 'departments' ? 'e.g. Research & Development' : 'e.g. Furniture'} />
          {tab === 'departments' && (
            <>
              <Select label="Department Head" value={newHead} onChange={(e) => setNewHead(e.target.value)}>
                <option value="">None</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
              <Select label="Parent Department" value={newParent} onChange={(e) => setNewParent(e.target.value)}>
                <option value="">None (top-level)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
