import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Clock, AlertTriangle, Plus, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '../lib/apiClient';
import type { Asset, Booking, Department } from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AssetTag } from '../components/ui/AssetTag';
import { FilterSelect } from '../components/ui/Filters';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8am - 7pm

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function toHourKey(iso: string): number {
  return new Date(iso).getHours();
}

export function BookingScreen() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date('2025-01-15'));
  const [modalOpen, setModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({ startTime: '09:00', endTime: '10:00', departmentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [conflictBooking, setConflictBooking] = useState<Booking | null>(null);
  const [requestedRange, setRequestedRange] = useState<{ start: string; end: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, d, b] = await Promise.all([
        apiGet<Asset[]>('/assets'),
        apiGet<Department[]>('/departments'),
        apiGet<Booking[]>('/bookings'),
      ]);
      setAssets(a);
      setDepartments(d);
      setBookings(b);
      const bookable = a.filter((x) => x.isBookable);
      if (bookable.length > 0 && !selectedAssetId) setSelectedAssetId(bookable[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bookableAssets = assets.filter((a) => a.isBookable);
  const filteredAssets = filterLocation ? bookableAssets.filter((a) => a.location?.includes(filterLocation)) : bookableAssets;
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const dateStr = formatDate(currentDate);

  const dayBookings = bookings.filter((b) => {
    if (b.assetId !== selectedAssetId || b.status !== 'active') return false;
    const bDate = new Date(b.startTime).toISOString().split('T')[0];
    return bDate === dateStr;
  });

  const handleBook = async () => {
    if (!selectedAssetId) return;
    setSubmitting(true);
    setConflictBooking(null);
    setSuccessMsg(null);
    const startIso = new Date(`${dateStr}T${newBooking.startTime}:00`).toISOString();
    const endIso = new Date(`${dateStr}T${newBooking.endTime}:00`).toISOString();
    setRequestedRange({ start: newBooking.startTime, end: newBooking.endTime });
    try {
      await apiPost('/bookings', {
        assetId: selectedAssetId,
        startTime: startIso,
        endTime: endIso,
        departmentId: newBooking.departmentId || undefined,
      });
      setSuccessMsg('Booking confirmed');
      setModalOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const conflicting = (err as unknown as { conflictingBooking: Booking }).conflictingBooking;
        if (conflicting) setConflictBooking(conflicting);
      } else {
        setError(err instanceof Error ? err.message : 'Booking failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const prevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const nextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));

  if (loading) return <div><PageHeader title="Resource Booking" subtitle="Book shared resources and meeting spaces" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Resource Booking" /><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div>
      <PageHeader title="Resource Booking" subtitle="Book shared resources and meeting spaces">
        <Button size="sm" onClick={() => { setConflictBooking(null); setSuccessMsg(null); setModalOpen(true); }} disabled={!selectedAssetId}>
          <Plus className="w-3.5 h-3.5" /> Book a Slot
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left: Resource picker */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Resources" subtitle={`${filteredAssets.length} bookable`} />
            <CardBody>
              <div className="mb-3">
                <FilterSelect label="Location" value={filterLocation} onChange={setFilterLocation} options={[...new Set(bookableAssets.map((a) => a.location).filter(Boolean))].map((l) => ({ value: l!, label: l! }))} />
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
                {filteredAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssetId(a.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${selectedAssetId === a.id ? 'bg-accent-50 border border-accent-200' : 'hover:bg-canvas-100 border border-transparent'}`}
                  >
                    <div>
                      <AssetTag tag={a.tag} />
                      <div className="text-xs text-ink-600 mt-1">{a.name}</div>
                      {a.location && <div className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{a.location}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: Calendar timeline */}
        <div className="lg:col-span-3">
          <Card>
            {/* Calendar header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-canvas-400/60">
              <div className="flex items-center gap-3">
                <button onClick={prevDay} className="w-7 h-7 rounded-lg hover:bg-canvas-200 flex items-center justify-center text-ink-400 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm font-semibold text-ink-800 min-w-0">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <button onClick={nextDay} className="w-7 h-7 rounded-lg hover:bg-canvas-200 flex items-center justify-center text-ink-400 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {selectedAsset && (
                <div className="flex items-center gap-2">
                  <AssetTag tag={selectedAsset.tag} />
                  <span className="text-sm text-ink-600">{selectedAsset.name}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="relative">
              {HOURS.map((hour) => {
                const bookingsAtHour = dayBookings.filter((b) => {
                  const startH = toHourKey(b.startTime);
                  const endH = new Date(b.endTime).getHours();
                  return hour >= startH && hour < endH;
                });
                const conflictAtHour = conflictBooking && hour >= toHourKey(conflictBooking.startTime) && hour < new Date(conflictBooking.endTime).getHours();
                const requestedAtHour = requestedRange && hour >= parseInt(requestedRange.start) && hour < parseInt(requestedRange.end);

                return (
                  <div key={hour} className="flex border-b border-canvas-400/40 min-h-16">
                    {/* Hour label */}
                    <div className="w-16 shrink-0 px-3 py-2 text-xs text-ink-400 tabular-nums">
                      {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'pm' : 'am'}
                    </div>
                    {/* Slot content */}
                    <div className="flex-1 py-1.5 pr-3 relative">
                      {bookingsAtHour.map((b) => {
                        const startH = toHourKey(b.startTime);
                        if (hour !== startH) return null;
                        const endH = new Date(b.endTime).getHours();
                        const span = endH - hour;
                        return (
                          <div
                            key={b.id}
                            className="rounded-lg bg-status-allocatedSoft border border-status-allocated/20 px-3 py-2 mb-1"
                            style={{ height: `${span * 56 - 8}px` }}
                          >
                            <div className="text-xs font-medium text-status-allocated flex items-center gap-1.5">
                              <CalendarDays className="w-3 h-3" />
                              Booked — {b.departmentName ?? b.userName}
                            </div>
                            <div className="text-[10px] text-status-allocated/70 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {toHourKey(b.startTime)}:00 – {new Date(b.endTime).getHours()}:00
                            </div>
                          </div>
                        );
                      })}

                      {/* Conflict inline rendering */}
                      {conflictAtHour && hour === toHourKey(conflictBooking.startTime) && (
                        <div className="rounded-lg bg-status-lostSoft/60 border border-status-lost/30 border-dashed px-3 py-2 mb-1 animate-slideUp">
                          <div className="text-xs font-medium text-status-lost flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Conflict — {conflictBooking.departmentName ?? conflictBooking.userName}
                          </div>
                          <div className="text-[10px] text-status-lost/70 mt-0.5">
                            {toHourKey(conflictBooking.startTime)}:00 – {new Date(conflictBooking.endTime).getHours()}:00
                          </div>
                        </div>
                      )}

                      {/* Requested range inline rendering */}
                      {requestedAtHour && hour === parseInt(requestedRange.start) && conflictBooking && (
                        <div className="rounded-lg bg-status-reservedSoft/50 border border-status-reserved/30 border-dashed px-3 py-2 animate-slideUp">
                          <div className="text-xs font-medium text-status-reserved flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Requested {requestedRange.start}–{requestedRange.end} — slot unavailable
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {dayBookings.length === 0 && !conflictBooking && (
              <div className="px-5 py-6">
                <EmptyState icon={CalendarDays} title="No bookings today" description="This resource is free all day — book a slot to get started" />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setConflictBooking(null); setRequestedRange(null); }}
        title="Book a Slot"
        subtitle={selectedAsset ? `${selectedAsset.tag} — ${selectedAsset.name}` : ''}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setModalOpen(false); setConflictBooking(null); setRequestedRange(null); }}>Cancel</Button>
            <Button size="sm" loading={submitting} onClick={handleBook}>Confirm Booking</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          {successMsg && (
            <div className="px-3 py-2 rounded-lg bg-status-availableSoft text-status-available text-xs">{successMsg}</div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas-100 text-xs text-ink-500">
            <CalendarDays className="w-3.5 h-3.5" />
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={newBooking.startTime} onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })} />
            <Input label="End Time" type="time" value={newBooking.endTime} onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })} />
          </div>
          <Select label="Department (optional)" value={newBooking.departmentId} onChange={(e) => setNewBooking({ ...newBooking, departmentId: e.target.value })}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
