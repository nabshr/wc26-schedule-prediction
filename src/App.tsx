import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
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

function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
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
