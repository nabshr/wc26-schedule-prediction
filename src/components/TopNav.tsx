import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import logoLight from '../assets/wc26_light.png';
import logoDark from '../assets/wc26_dark.png';

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();

  const currentLogo = theme === 'dark' ? logoDark : logoLight;

  return (
    <header className="sticky top-0 z-40 h-24 md:h-28 border-b border-slate-200/60 dark:border-slate-700/40 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl">
      <div className="relative h-full flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block w-10" />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 text-center">
          <img
            src={currentLogo}
            alt="FIFA World Cup 2026 logo"
            className="h-12 md:h-16 w-auto object-contain flex-shrink-0"
          />

          <div className="leading-none">
            <div className="text-[1.35rem] md:text-[2rem] lg:text-[2.4rem] font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              FIFA World Cup 2026
            </div>
            <div className="text-sm md:text-base font-semibold text-slate-500 dark:text-slate-300 mt-1">
              Predictor
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
