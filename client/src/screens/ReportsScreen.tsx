import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';
import { apiGet } from '../lib/apiClient';
import type {
  UtilizationReport, MaintenanceFrequencyReport, LifecycleReport,
  DepartmentAllocationReport, BookingHeatmapReport,
} from '../lib/types';
import { PageHeader } from '../components/Layout';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AssetTag } from '../components/ui/AssetTag';
import { LoadingState, ErrorState } from '../components/ui/States';

const urgencyConfig = {
  high: { bg: 'bg-status-lostSoft', text: 'text-status-lost', dot: 'bg-status-lost', label: 'Urgent' },
  medium: { bg: 'bg-status-reservedSoft', text: 'text-status-reserved', dot: 'bg-status-reserved', label: 'Soon' },
  low: { bg: 'bg-status-availableSoft', text: 'text-status-available', dot: 'bg-status-available', label: 'Later' },
};

const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const heatmapHours = Array.from({ length: 12 }, (_, i) => 8 + i);

export function ReportsScreen() {
  const [utilization, setUtilization] = useState<UtilizationReport | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceFrequencyReport | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleReport | null>(null);
  const [, setDeptAlloc] = useState<DepartmentAllocationReport | null>(null);
  const [heatmap, setHeatmap] = useState<BookingHeatmapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, m, l, d, h] = await Promise.all([
        apiGet<UtilizationReport>('/reports/utilization'),
        apiGet<MaintenanceFrequencyReport>('/reports/maintenance-frequency'),
        apiGet<LifecycleReport>('/reports/upcoming-lifecycle'),
        apiGet<DepartmentAllocationReport>('/reports/department-allocation'),
        apiGet<BookingHeatmapReport>('/reports/booking-heatmap'),
      ]);
      setUtilization(u);
      setMaintenance(m);
      setLifecycle(l);
      setDeptAlloc(d);
      setHeatmap(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      await apiGet('/reports/export?type=summary&format=csv');
    } catch {
      // mock — no-op
    }
  };

  if (loading) return <div><PageHeader title="Reports & Analytics" subtitle="Insights into asset utilization and maintenance" /><LoadingState /></div>;
  if (error) return <div><PageHeader title="Reports & Analytics" /><ErrorState message={error} onRetry={load} /></div>;

  const maxMaintenance = Math.max(...(maintenance?.months.map((m) => m.count) ?? [1]));

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Insights into asset utilization and maintenance">
        <Button size="sm" variant="subtle" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export Report</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Utilization by Department */}
        {utilization && (
          <Card>
            <CardHeader title="Utilization by Department" subtitle="Allocated vs available assets" action={<BarChart3 className="w-4 h-4 text-ink-300" />} />
            <CardBody>
              <div className="space-y-3">
                {utilization.departments.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-ink-600">{d.name}</span>
                      <span className="text-xs text-ink-400 tabular-nums">{d.allocated}/{d.total}</span>
                    </div>
                    <div className="flex h-5 rounded-md overflow-hidden bg-canvas-200">
                      <div className="bg-status-allocated transition-all duration-500" style={{ width: `${d.total > 0 ? (d.allocated / d.total) * 100 : 0}%` }} />
                      <div className="bg-status-available transition-all duration-500" style={{ width: `${d.total > 0 ? (d.available / d.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-status-allocated" /> Allocated</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-status-available" /> Available</span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Maintenance Frequency */}
        {maintenance && (
          <Card>
            <CardHeader title="Maintenance Frequency" subtitle="Requests over the last 6 months" action={<BarChart3 className="w-4 h-4 text-ink-300" />} />
            <CardBody>
              <div className="flex items-end justify-between gap-2 h-40">
                {maintenance.months.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="text-xs text-ink-500 tabular-nums">{m.count}</div>
                    <div className="w-full bg-accent-500/80 rounded-t-md transition-all duration-500 hover:bg-accent-500" style={{ height: `${(m.count / maxMaintenance) * 100}%` }} />
                    <div className="text-xs text-ink-400">{m.month}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Most Used vs Idle — ranked lists */}
        {utilization && (
          <Card>
            <CardHeader title="Most Used vs Idle Assets" subtitle="By allocation frequency" />
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-status-available">
                    <TrendingUp className="w-3.5 h-3.5" /> Most Used
                  </div>
                  <div className="space-y-1.5">
                    {utilization.departments.sort((a, b) => b.allocated - a.allocated).slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded-full bg-status-availableSoft text-status-available flex items-center justify-center text-[10px] font-semibold">{i + 1}</span>
                        <span className="text-ink-600 flex-1 truncate">{d.name}</span>
                        <span className="text-ink-400 tabular-nums">{d.allocated}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-ink-400">
                    <TrendingDown className="w-3.5 h-3.5" /> Idle
                  </div>
                  <div className="space-y-1.5">
                    {utilization.departments.sort((a, b) => b.available - a.available).slice(0, 4).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded-full bg-canvas-200 text-ink-400 flex items-center justify-center text-[10px] font-semibold">{i + 1}</span>
                        <span className="text-ink-600 flex-1 truncate">{d.name}</span>
                        <span className="text-ink-400 tabular-nums">{d.available}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Booking Heatmap */}
        {heatmap && (
          <Card>
            <CardHeader title="Booking Heatmap" subtitle="Day and hour grid of booking activity" action={<Calendar className="w-4 h-4 text-ink-300" />} />
            <CardBody className="overflow-x-auto scrollbar-thin">
              <div className="min-w-[400px]">
                <div className="flex gap-1 mb-1">
                  <div className="w-8" />
                  {heatmapHours.map((h) => (
                    <div key={h} className="flex-1 text-center text-[10px] text-ink-300 tabular-nums">{h}</div>
                  ))}
                </div>
                {heatmap.grid.map((row, dayIdx) => (
                  <div key={dayIdx} className="flex gap-1 mb-1">
                    <div className="w-8 text-[10px] text-ink-400 flex items-center">{heatmapDays[dayIdx]}</div>
                    {row.map((cell, hIdx) => {
                      const intensity = cell.count / 5;
                      return (
                        <div
                          key={hIdx}
                          className="flex-1 aspect-square rounded-sm transition-all hover:ring-1 hover:ring-accent-400 cursor-pointer"
                          style={{
                            backgroundColor: intensity === 0 ? '#F1EFEA' : `rgba(201, 122, 61, ${0.15 + intensity * 0.7})`,
                          }}
                          title={`${heatmapDays[dayIdx]} ${cell.hour}:00 — ${cell.count} bookings`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-ink-400">
                  <span>Less</span>
                  {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(201, 122, 61, ${0.15 + i * 0.7})` }} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Lifecycle / Upcoming */}
        {lifecycle && (
          <Card className="lg:col-span-2">
            <CardHeader title="Assets Due for Maintenance / Nearing Retirement" subtitle="Upcoming lifecycle events" action={<Clock className="w-4 h-4 text-ink-300" />} />
            <CardBody className="!px-0 !py-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-canvas-400/60 bg-canvas-100/50">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Tag</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Asset</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Event</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Urgency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-canvas-400/40">
                    {lifecycle.assets.map((a) => {
                      const cfg = urgencyConfig[a.urgency];
                      return (
                        <tr key={a.id} className="hover:bg-canvas-100/40 transition-colors">
                          <td className="px-5 py-3"><AssetTag tag={a.tag} /></td>
                          <td className="px-5 py-3 font-medium text-ink-700">{a.name}</td>
                          <td className="px-5 py-3 text-ink-600">{a.event}</td>
                          <td className="px-5 py-3 text-ink-500">{a.eventDate}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
