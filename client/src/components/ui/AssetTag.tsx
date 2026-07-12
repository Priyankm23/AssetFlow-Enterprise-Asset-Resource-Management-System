export function AssetTag({ tag, className = '' }: { tag: string; className?: string }) {
  return (
    <span className={`tag-mono inline-flex items-center px-1.5 py-0.5 rounded bg-ink-50 text-ink-700 border border-ink-100 ${className}`}>
      {tag}
    </span>
  );
}

export function MonoText({ children, className = '' }: { children: string; className?: string }) {
  return <span className={`tag-mono text-ink-600 ${className}`}>{children}</span>;
}
