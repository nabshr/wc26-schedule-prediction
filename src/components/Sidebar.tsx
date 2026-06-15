import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Brain, Grid3X3, GitBranch,
  Star, BarChart3, Target, Radio, Flag, Clock, Shield,
  BookOpen, Settings, ChevronLeft, ChevronRight, Trophy
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/wc26_light.png';
import logoDark from '../assets/wc26_dark.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule & Results' },
  { to: '/predictor', icon: Brain, label: 'Match Predictor' },
  { to: '/groups', icon: Grid3X3, label: 'Groups' },
  { to: '/bracket', icon: GitBranch, label: 'Bracket' },
  { to: '/ratings', icon: Star, label: 'Ratings' },
  { to: '/results', icon: BarChart3, label: 'Results' },
  { to: '/accuracy', icon: Target, label: 'Accuracy' },
  { to: '/live', icon: Radio, label: 'Live Forecast' },
  { to: '/pre-tournament', icon: Flag, label: 'Pre-Tournament' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/teams', icon: Shield, label: 'Teams' },
  { to: '/methodology', icon: BookOpen, label: 'Methodology' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const { theme } = useTheme();
  const championLogo = theme === 'dark' ? logoDark : logoLight;

  return (
    <aside className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-surface-dark-100/80 backdrop-blur-xl transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200/60 dark:border-slate-700/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow flex-shrink-0">
          <img
                  src={championLogo}
                  alt="FIFA World Cup 2026 logo"
                  className="w-full h-full object-contain"
                />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">World Cup</h1>
            <p className="text-[10px] font-medium text-brand-500 dark:text-brand-400 uppercase tracking-wider">2026 Predictor</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-12 border-t border-slate-200/60 dark:border-slate-700/40 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
