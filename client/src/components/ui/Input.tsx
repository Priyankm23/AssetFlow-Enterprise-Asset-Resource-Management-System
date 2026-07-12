import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-ink-600">{label}</label>}
      <input
        className={`h-9 px-3 text-sm rounded-lg border bg-white text-ink-800 placeholder:text-ink-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 ${error ? 'border-status-lost/50' : 'border-canvas-400'} ${className}`}
        {...rest}
      />
      {error ? <span className="text-xs text-status-lost">{error}</span> : hint ? <span className="text-xs text-ink-300">{hint}</span> : null}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className = '', children, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-ink-600">{label}</label>}
      <select
        className={`h-9 px-3 text-sm rounded-lg border bg-white text-ink-800 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 ${error ? 'border-status-lost/50' : 'border-canvas-400'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-xs text-status-lost">{error}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-ink-600">{label}</label>}
      <textarea
        className={`px-3 py-2 text-sm rounded-lg border bg-white text-ink-800 placeholder:text-ink-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 ${error ? 'border-status-lost/50' : 'border-canvas-400'} ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-status-lost">{error}</span>}
    </div>
  );
}
