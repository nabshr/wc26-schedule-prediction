interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function SegmentedTabs({ tabs, active, onChange }: SegmentedTabsProps) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-0.5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            active === tab.id ? 'tab-active' : 'tab-inactive'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
