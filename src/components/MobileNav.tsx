import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Brain, Grid3X3, GitBranch,
  Star, BarChart3, Target, Radio, Flag, Clock, Shield,
  BookOpen, Settings, Trophy, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/wc26_light.jpg';
import logoDark from '../assets/wc26_dark.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { to: '/predictor', icon: Brain, label: 'Predictor' },
  { to: '/groups', icon: Grid3X3, label: 'Groups' },
  { to: '/bracket', icon: GitBranch, label: 'Bracket' },
  { to: '/ratings', icon: Star, label: 'Ratings' },
  { to: '/results', icon: BarChart3, label: 'Results' },
  { to: '/accuracy', icon: Target, label: 'Accuracy' },
  { to: '/live', icon: Radio, label: 'Live' },
  { to: '/pre-tournament', icon: Flag, label: 'Pre-Tournament' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/teams', icon: Shield, label: 'Teams' },
  { to: '/methodology', icon: BookOpen, label: 'Methodology' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  if (!open) return null;

  const { theme } = useTheme();
  const championLogo = theme === 'dark' ? logoDark : logoLight;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-surface-dark-100 shadow-2xl animate-slide-right">
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
              <img
                  src={championLogo}
                  alt="FIFA World Cup 2026 logo"
                  className="w-full h-full object-contain"
                />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">World Cup 2026</h1>
              <p className="text-[10px] font-medium text-brand-500 dark:text-brand-400 uppercase tracking-wider">Predictor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="py-3 px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-64px)]">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
