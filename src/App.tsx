import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { X } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopNav from './components/TopNav';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Predictor from './pages/Predictor';
import Groups from './pages/Groups';
import Bracket from './pages/Bracket';
import Ratings from './pages/Ratings';
import Results from './pages/Results';
import Accuracy from './pages/Accuracy';
import LiveForecast from './pages/LiveForecast';
import PreTournament from './pages/PreTournament';
import History from './pages/History';
import Teams from './pages/Teams';
import Methodology from './pages/Methodology';
import Admin from './pages/Admin';
import logoLight from './assets/wc26_light.png';
import logoDark from './assets/wc26_dark.png';
import { useTheme } from './context/ThemeContext';


function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showCreditBadge, setShowCreditBadge] = useState(true);
  const { theme } = useTheme();

  const currentLogo = theme === 'dark' ? logoDark : logoLight;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="relative flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/predictor" element={<Predictor />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/results" element={<Results />} />
            <Route path="/accuracy" element={<Accuracy />} />
            <Route path="/live" element={<LiveForecast />} />
            <Route path="/pre-tournament" element={<PreTournament />} />
            <Route path="/history" element={<History />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        {showCreditBadge && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="relative glass-panel rounded-2xl px-3 py-2 pr-9 shadow-lg border border-white/10 dark:border-white/10">
              <button
                onClick={() => setShowCreditBadge(false)}
                aria-label="Close"
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
        
              <div className="flex items-center gap-2">
                <img
                  src={currentLogo}
                  alt="Nabin Shrestha logo"
                  className="h-7 w-7 object-contain rounded-md"
                />
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    © Nabin Shrestha
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 whitespace-nowrap">
                    FIFA World Cup 2026 Predictor
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}
