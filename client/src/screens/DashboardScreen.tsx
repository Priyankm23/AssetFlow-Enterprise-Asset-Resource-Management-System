import { useEffect, useState } from "react";
import {
  Package,
  ArrowLeftRight,
  Wrench,
  CalendarDays,
  Clock,
  AlertTriangle,
  Plus,
  BookOpen,
  Wrench as WrenchIcon,
  Activity,
  TrendingUp,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import type { DashboardData, ActivityEntry } from "../lib/types";
import { PageHeader } from "../components/Layout";
import { KpiCard } from "../components/ui/KpiCard";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AssetTag } from "../components/ui/AssetTag";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";
import type { Route } from "../lib/router";
import { useAuth } from "../lib/auth";

const activityIcons: Record<ActivityEntry["type"], typeof Activity> = {
  assignment: Package,
  maintenance: Wrench,
  booking: CalendarDays,
  transfer: ArrowLeftRight,
  overdue: AlertTriangle,
  audit: Activity,
};

const activityColors: Record<ActivityEntry["type"], string> = {
  assignment: "text-status-allocated bg-status-allocatedSoft",
  maintenance: "text-status-maintenance bg-status-maintenanceSoft",
  booking: "text-status-reserved bg-status-reservedSoft",
  transfer: "text-accent-600 bg-accent-50",
  overdue: "text-status-lost bg-status-lostSoft",
  audit: "text-ink-500 bg-ink-50",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DashboardScreen({
  onNavigate,
}: {
  onNavigate: (r: Route) => void;
}) {
  const { user } = useAuth();
  const canRegisterAsset =
    user?.role === "Admin" || user?.role === "AssetManager";
  const [data, setData] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, act] = await Promise.all([
        apiGet<DashboardData>("/dashboard"),
        apiGet<ActivityEntry[]>("/activity"),
      ]);
      setData(dash);
      setActivity(act);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your organization's assets and resources"
        />
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name?.split(" ")[0]}`}
      >
        {canRegisterAsset && (
          <Button size="sm" onClick={() => onNavigate("assets")}>
            <Plus className="w-3.5 h-3.5" /> Register Asset
          </Button>
        )}
        <Button
          size="sm"
          variant="subtle"
          onClick={() => onNavigate("booking")}
        >
          <BookOpen className="w-3.5 h-3.5" /> Book Resource
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => onNavigate("maintenance")}
        >
          <WrenchIcon className="w-3.5 h-3.5" /> Raise Maintenance
        </Button>
      </PageHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Available"
          value={data.kpis.assetsAvailable}
          icon={<Package className="w-3.5 h-3.5" />}
          color="available"
          onClick={() => onNavigate("assets")}
        />
        <KpiCard
          label="Allocated"
          value={data.kpis.assetsAllocated}
          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
          color="allocated"
        />
        <KpiCard
          label="Maintenance Today"
          value={data.kpis.maintenanceToday}
          icon={<Wrench className="w-3.5 h-3.5" />}
          color="maintenance"
          onClick={() => onNavigate("maintenance")}
        />
        <KpiCard
          label="Active Bookings"
          value={data.kpis.activeBookings}
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          color="reserved"
          onClick={() => onNavigate("booking")}
        />
        <KpiCard
          label="Pending Transfers"
          value={data.kpis.pendingTransfers}
          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
          color="neutral"
          onClick={() => onNavigate("allocation")}
        />
        <KpiCard
          label="Upcoming Returns"
          value={data.kpis.upcomingReturns}
          icon={<Clock className="w-3.5 h-3.5" />}
          color="neutral"
        />
      </div>

      {/* Overdue Banner */}
      {data.overdueReturns.length > 0 && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl2 border border-status-lost/20 bg-status-lostSoft/50 animate-slideUp">
          <div className="w-8 h-8 rounded-lg bg-status-lostSoft flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-status-lost" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-status-lost">
              {data.overdueReturns.length} overdue return
              {data.overdueReturns.length > 1 ? "s" : ""} need attention
            </div>
            <div className="text-sm text-status-lost/80 mt-0.5">
              {data.overdueReturns
                .map((r) => `${r.assetTag} — ${r.holderUserName}`)
                .join(", ")}
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onNavigate("allocation")}
          >
            Review
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Activity"
              subtitle="Latest events across your organization"
              action={<TrendingUp className="w-5 h-5 text-ink-300" />}
            />
            <CardBody className="!px-0 !py-0">
              {activity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Actions across your organization will appear here"
                />
              ) : (
                <div className="divide-y divide-canvas-400/50">
                  {activity.map((entry) => {
                    const Icon = activityIcons[entry.type];
                    const color = activityColors[entry.type];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 px-5 py-3 hover:bg-canvas-100/50 transition-colors"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base text-ink-800">
                            {entry.description}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-ink-400">
                              {timeAgo(entry.timestamp)}
                            </span>
                            {entry.entityTag && (
                              <AssetTag tag={entry.entityTag} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Upcoming Returns */}
        <div>
          <Card>
            <CardHeader
              title="Upcoming Returns"
              subtitle="Assets due back soon"
            />
            <CardBody className="!px-0 !py-0">
              {data.upcomingReturns.length === 0 ? (
                <EmptyState icon={Clock} title="No upcoming returns" />
              ) : (
                <div className="divide-y divide-canvas-400/50">
                  {data.upcomingReturns.map((r) => (
                    <div
                      key={r.id}
                      className="px-5 py-3 hover:bg-canvas-100/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <AssetTag tag={r.assetTag} />
                        <span className="text-sm text-ink-400">
                          {r.expectedReturnDate}
                        </span>
                      </div>
                      <div className="text-base text-ink-800 mt-1.5">
                        {r.assetName}
                      </div>
                      <div className="text-sm text-ink-400 mt-0.5">
                        {r.holderUserName} · {r.holderDepartmentName}
                      </div>
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
