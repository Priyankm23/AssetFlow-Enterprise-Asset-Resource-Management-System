import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl2 bg-canvas-300 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-ink-300" />
      </div>
      <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
      {description && <p className="text-xs text-ink-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-2 text-ink-400 text-sm">
        <div className="w-4 h-4 border-2 border-ink-200 border-t-accent-500 rounded-full animate-spin" />
        {message}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl2 bg-status-lostSoft flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-status-lost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink-700">Something went wrong</h3>
      <p className="text-xs text-ink-400 mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-sm text-accent-600 hover:text-accent-700 font-medium">
          Try again
        </button>
      )}
    </div>
  );
}
