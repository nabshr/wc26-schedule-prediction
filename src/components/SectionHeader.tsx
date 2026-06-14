import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-brand-500 dark:text-brand-400">{icon}</span>}
        <div>
          <h2 className="section-header">{title}</h2>
          {subtitle && <p className="section-subheader mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
