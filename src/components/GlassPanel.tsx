import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
}

export default function GlassPanel({ children, className = '', variant = 'default' }: GlassPanelProps) {
  const base = variant === 'strong' ? 'glass-panel-strong' : 'glass-panel';
  return <div className={`rounded-2xl p-5 ${base} ${className}`}>{children}</div>;
}
