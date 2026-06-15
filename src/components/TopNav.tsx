import { Sun, Moon, Menu, Trophy } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow flex-shrink-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>

          <div className="min-w-0">
            <span className="block sm:hidden text-sm font-bold text-slate-900 dark:text-white truncate">
              WC26
            </span>

            <span className="hidden sm:block text-sm md:text-base font-bold text-slate-900 dark:text-white truncate">
              FIFA World Cup 2026
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
