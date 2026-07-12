import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Package,
  Wrench,
  CalendarDays,
  ArrowLeftRight,
  AlertTriangle,
  ClipboardCheck,
  CheckCheck,
} from "lucide-react";
import { apiGet, apiPatch } from "../lib/apiClient";
import type { Notification } from "../lib/types";
import { PageHeader } from "../components/Layout";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AssetTag } from "../components/ui/AssetTag";
import { LoadingState, ErrorState, EmptyState } from "../components/ui/States";

const notifIcons: Record<Notification["type"], typeof Bell> = {
  assignment: Package,
  maintenance: Wrench,
  booking: CalendarDays,
  transfer: ArrowLeftRight,
  overdue: AlertTriangle,
  audit: ClipboardCheck,
};

const notifColors: Record<Notification["type"], string> = {
  assignment: "bg-status-allocatedSoft text-status-allocated",
  maintenance: "bg-status-maintenanceSoft text-status-maintenance",
  booking: "bg-status-reservedSoft text-status-reserved",
  transfer: "bg-accent-50 text-accent-600",
  overdue: "bg-status-lostSoft text-status-lost",
  audit: "bg-ink-50 text-ink-500",
};

function groupByDay(
  notifs: Notification[],
): { date: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifs) {
    const date = new Date(n.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(n);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "alerts" | "approvals" | "bookings"
  >("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Notification[]>("/notifications");
      setNotifications(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiPatch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markRead(n.id)));
  };

  if (loading)
    return (
      <div>
        <PageHeader
          title="Notifications & Activity"
          subtitle="Stay on top of events across your organization"
        />
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div>
        <PageHeader title="Notifications & Activity" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "alerts") return n.type === "overdue" || n.type === "audit";
    if (filter === "approvals")
      return (
        n.type === "assignment" ||
        n.type === "maintenance" ||
        n.type === "transfer"
      );
    if (filter === "bookings") return n.type === "booking";
    return true;
  });
  const grouped = groupByDay(filtered);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications & Activity"
        subtitle="Stay on top of events across your organization"
      >
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-canvas-400 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors border-r border-canvas-400 ${filter === "all" ? "bg-ink-800 text-white" : "bg-white text-ink-500 hover:bg-canvas-100"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("alerts")}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors border-r border-canvas-400 ${filter === "alerts" ? "bg-ink-800 text-white" : "bg-white text-ink-500 hover:bg-canvas-100"}`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilter("approvals")}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors border-r border-canvas-400 ${filter === "approvals" ? "bg-ink-800 text-white" : "bg-white text-ink-500 hover:bg-canvas-100"}`}
            >
              Approvals
            </button>
            <button
              onClick={() => setFilter("bookings")}
              className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${filter === "bookings" ? "bg-ink-800 text-white" : "bg-white text-ink-500 hover:bg-canvas-100"}`}
            >
              Bookings
            </button>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="subtle" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </PageHeader>

      <Card>
        <CardBody className="!px-0 !py-0">
          {grouped.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={
                filter === "alerts"
                  ? "No alerts"
                  : filter === "approvals"
                    ? "No approvals"
                    : filter === "bookings"
                      ? "No bookings"
                      : "No notifications yet"
              }
              description="Notifications about assignments, maintenance, bookings, and more will appear here"
            />
          ) : (
            <div>
              {grouped.map((group) => (
                <div key={group.date}>
                  {/* Day header */}
                  <div className="px-5 py-2.5 bg-canvas-100/60 border-b border-canvas-400/40 sticky top-0">
                    <span className="text-sm font-semibold text-ink-500 uppercase tracking-wide">
                      {group.date}
                    </span>
                  </div>
                  {/* Items */}
                  <div className="divide-y divide-canvas-400/40">
                    {group.items.map((n) => {
                      const Icon = notifIcons[n.type];
                      const color = notifColors[n.type];
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && markRead(n.id)}
                          className={`flex items-start gap-3.5 px-5 py-4 transition-colors ${!n.read ? "bg-accent-50/30 hover:bg-accent-50/50 cursor-pointer" : "hover:bg-canvas-100/40"}`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}
                          >
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-ink-700">
                                {n.title}
                              </span>
                              {!n.read && (
                                <span className="w-2.5 h-2.5 rounded-full bg-accent-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-sm text-ink-500 mt-0.5">
                              {n.message}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-sm text-ink-300">
                                {timeLabel(n.createdAt)}
                              </span>
                              {n.entityTag && <AssetTag tag={n.entityTag} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
