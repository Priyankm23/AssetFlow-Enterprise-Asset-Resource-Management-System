import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { Route } from '../lib/router';

export function Layout({ current, onNavigate, children }: { current: Route; onNavigate: (r: Route) => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas-200">
      <Sidebar current={current} onNavigate={onNavigate} />
      <main className="flex-1 min-w-0 lg:ml-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pt-14 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
