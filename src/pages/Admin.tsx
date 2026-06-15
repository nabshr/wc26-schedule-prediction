import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Database,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  Radio,
  Zap,
  Gauge,
  Shield,
  Edit3,
  ArrowRight,
  LogIn,
  LogOut,
  Lock
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import { supabase } from '../lib/supabase';
import { useWC2026Fixtures } from '../lib/useWC2026Fixtures';
import { WC2026_TEAMS, GROUP_NAMES } from '../data/worldCup2026';
import { simulateGroupStage } from '../lib/prediction';

interface DbStats {
  tournaments: number;
  teams: number;
  matches: number;
  stages: number;
  group_standings: number;
  tournament_teams: number;
}

interface SyncLog {
  timestamp: string;
  action: string;
  status: 'success' | 'error' | 'info';
  message: string;
  inserted?: number;
  updated?: number;
  errors?: number;
}

const ADMIN_EMAIL = 'nabshr.ns@gmail.com';

export default function Admin() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [overrideHome, setOverrideHome] = useState('');
  const [overrideAway, setOverrideAway] = useState('');
  const [overrideHomeScore, setOverrideHomeScore] = useState('');
  const [overrideAwayScore, setOverrideAwayScore] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [providerMode, setProviderModeState] = useState<string>('');

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const {
    providerConfig,
    lastFixtureSync,
    lastLiveSync,
    hasLiveMatch,
    syncing,
    triggerSync,
    refetch: refetchSyncData,
    syncRuns,
    fixtures,
  } = useWC2026Fixtures();

  const email = user?.email?.toLowerCase() ?? '';
  const isAuthorized = email === ADMIN_EMAIL;

  const addLog = useCallback((entry: Omit<SyncLog, 'timestamp'>) => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...entry,
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;
      setUser(error ? null : (data.user ?? null));
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const loadStats = useCallback(async () => {
    if (!isAuthorized) return;

    setLoading(true);
    addLog({ action: 'Load Stats', status: 'info', message: 'Fetching database record counts...' });

    try {
      const tables = ['tournaments', 'teams', 'matches', 'stages', 'group_standings', 'tournament_teams'] as const;
      const counts = await Promise.all(
        tables.map(async table => {
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          if (error) throw error;
          return count || 0;
        })
      );

      setStats({
        tournaments: counts[0],
        teams: counts[1],
        matches: counts[2],
        stages: counts[3],
        group_standings: counts[4],
        tournament_teams: counts[5],
      });

      addLog({ action: 'Load Stats', status: 'success', message: `Loaded counts for ${tables.length} tables` });
    } catch (err: any) {
      addLog({ action: 'Load Stats', status: 'error', message: err.message || 'Failed to load stats', errors: 1 });
    } finally {
      setLoading(false);
    }
  }, [addLog, isAuthorized]);

  useEffect(() => {
    if (isAuthorized) loadStats();
  }, [loadStats, isAuthorized]);

  useEffect(() => {
  if (window.location.hash.includes('access_token')) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);


  async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function handleSyncHistory() {
    addLog({ action: 'Sync History', status: 'info', message: 'Starting historical data sync...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-history`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        addLog({ action: 'Sync History', status: 'success', message: data.message || 'Sync completed' });
      } else {
        addLog({ action: 'Sync History', status: 'error', message: data.error || `HTTP ${res.status}`, errors: 1 });
      }
      loadStats();
    } catch (err: any) {
      addLog({ action: 'Sync History', status: 'error', message: err.message || 'Sync failed', errors: 1 });
    }
  }

  async function handleFixtureSync() {
    addLog({ action: 'Sync Fixtures', status: 'info', message: 'Triggering fixture sync via API-Football...' });
    const result = await triggerSync('fixtures');
    addLog({
      action: 'Sync Fixtures',
      status: result.success ? 'success' : 'error',
      message: result.message,
      errors: result.success ? 0 : 1,
    });
  }

  async function handleLiveSync() {
    addLog({ action: 'Sync Live', status: 'info', message: 'Triggering live match sync...' });
    const result = await triggerSync('live');
    addLog({
      action: 'Sync Live',
      status: result.success ? 'success' : 'error',
      message: result.message,
      errors: result.success ? 0 : 1,
    });
  }

  function handleRunSimulation() {
    setSimRunning(true);
    addLog({ action: 'Run Simulation', status: 'info', message: 'Starting 30K Monte Carlo simulation...' });

    setTimeout(() => {
      try {
        const result = simulateGroupStage(30000, 2026);
        addLog({
          action: 'Run Simulation',
          status: 'success',
          message: `Completed ${result.simulationRuns.toLocaleString()} runs (${result.modelVersion})`,
        });
      } catch (err: any) {
        addLog({ action: 'Run Simulation', status: 'error', message: err.message || 'Simulation failed', errors: 1 });
      } finally {
        setSimRunning(false);
      }
    }, 100);
  }

  async function handleOverrideScore() {
    if (!overrideHome || !overrideAway || overrideHomeScore === '' || overrideAwayScore === '' || !overrideDate) {
      addLog({ action: 'Manual Override', status: 'error', message: 'All fields required (home, away, scores, date)', errors: 1 });
      return;
    }

    setOverrideSubmitting(true);
    addLog({
      action: 'Manual Override',
      status: 'info',
      message: `Setting ${overrideHome} ${overrideHomeScore}-${overrideAwayScore} ${overrideAway}...`,
    });

    try {
      const kickoffUtc = `${overrideDate}T18:00:00Z`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-override`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: 'override_score',
          home_team_code: overrideHome,
          away_team_code: overrideAway,
          kickoff_utc: kickoffUtc,
          home_score: parseInt(overrideHomeScore),
          away_score: parseInt(overrideAwayScore),
        }),
      });

      const data = await res.json();
      addLog({
        action: 'Manual Override',
        status: res.ok ? 'success' : 'error',
        message: data.message || data.error,
        errors: res.ok ? 0 : 1,
      });

      if (res.ok) {
        setOverrideHome('');
        setOverrideAway('');
        setOverrideHomeScore('');
        setOverrideAwayScore('');
        setOverrideDate('');
        refetchSyncData();
      }
    } catch (err: any) {
      addLog({ action: 'Manual Override', status: 'error', message: err.message, errors: 1 });
    } finally {
      setOverrideSubmitting(false);
    }
  }

  async function handleRecomputeStandings() {
    addLog({ action: 'Recompute Standings', status: 'info', message: 'Recomputing group standings...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-override`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'recompute_standings' }),
      });
      const data = await res.json();
      addLog({ action: 'Recompute Standings', status: res.ok ? 'success' : 'error', message: data.message || data.error });
    } catch (err: any) {
      addLog({ action: 'Recompute Standings', status: 'error', message: err.message, errors: 1 });
    }
  }

  async function handleSetProviderMode(mode: string) {
    addLog({ action: 'Set Provider Mode', status: 'info', message: `Switching to ${mode}...` });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-override`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'set_provider_mode', mode }),
      });
      const data = await res.json();
      addLog({ action: 'Set Provider Mode', status: res.ok ? 'success' : 'error', message: data.message || data.error });
      if (res.ok) setProviderModeState(mode);
    } catch (err: any) {
      addLog({ action: 'Set Provider Mode', status: 'error', message: err.message, errors: 1 });
    }
  }

  async function handleBackupSync() {
    addLog({ action: 'Backup Sync', status: 'info', message: 'Triggering backup provider sync...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-override`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ action: 'backup_sync' }),
      });
      const data = await res.json();
      addLog({
        action: 'Backup Sync',
        status: res.ok ? 'success' : 'error',
        message: data.message || data.error,
        errors: res.ok ? 0 : 1,
      });
      if (res.ok) refetchSyncData();
    } catch (err: any) {
      addLog({ action: 'Backup Sync', status: 'error', message: err.message, errors: 1 });
    }
  }

  function formatSyncInfo(run: typeof lastFixtureSync) {
    if (!run) return { time: 'Never', status: 'N/A', updated: 0, errors: 0, errorMsg: null };
    const finished = run.finished_at ? new Date(run.finished_at).toLocaleTimeString('en-US', { hour12: false }) : 'In progress';
    return {
      time: finished,
      status: run.status,
      updated: run.fixtures_updated,
      errors: run.error_count,
      errorMsg: run.last_error,
    };
  }

  const fixtureSyncInfo = formatSyncInfo(lastFixtureSync);
  const liveSyncInfo = formatSyncInfo(lastLiveSync);

  const lastFixtureMeta = useMemo(() => {
    if (!lastFixtureSync?.metadata) return null;
    try {
      return typeof lastFixtureSync.metadata === 'string'
        ? JSON.parse(lastFixtureSync.metadata)
        : lastFixtureSync.metadata;
    } catch {
      return null;
    }
  }, [lastFixtureSync]);

  useEffect(() => {
    if (providerConfig?.provider_mode) setProviderModeState(providerConfig.provider_mode);
  }, [providerConfig?.provider_mode]);

  const { dailyCalls, pollingMode, quotaMode } = useMemo(() => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // const todayRuns = (syncRuns || []).filter(r => {
  //   const started = new Date(r.started_at);
  //   return started >= todayStart && (r.status === 'success' || r.status === 'running');
  // });

  const todayRuns = syncRuns.filter(r => {
    const started = new Date(r.started_at);
      return started >= todayStart;
  });

  const calls = todayRuns.length;
  const budget = 2000;

  let mode: 'live' | 'window' | 'idle';
  if (hasLiveMatch) {
    mode = 'live';
  } else {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);
    const hasUpcoming = fixtures.some(f => {
      if (f.status !== 'scheduled' || !f.timeUTC) return false;
      const kickoff = new Date(`${f.date}T${f.timeUTC}:00Z`);
      return kickoff >= now && kickoff <= windowEnd;
    });
    mode = hasUpcoming ? 'window' : 'idle';
  }

  let qMode: 'safe' | 'caution' | 'exhausted';
  if (calls >= budget) qMode = 'exhausted';
  else if (calls >= budget * 0.7) qMode = 'caution';
  else qMode = 'safe';

  return { dailyCalls: calls, pollingMode: mode, quotaMode: qMode };
}, [syncRuns, hasLiveMatch, fixtures]);


  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md">
          <GlassPanel className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-6 h-6 text-brand-500 dark:text-brand-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Checking access</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Verifying your admin session...
            </p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md">
          <GlassPanel className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-brand-500 dark:text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin access required</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
              Sign in with Google to continue to the admin panel.
            </p>
            <button className="btn-primary w-full justify-center" onClick={handleGoogleSignIn}>
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </button>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-md">
          <GlassPanel className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Not authorized</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              You are signed in as <span className="font-medium">{user.email}</span>, but this admin panel is restricted.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
              Only the approved Google account can access this page.
            </p>
            <button className="btn-secondary w-full justify-center" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </GlassPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Model management and data pipeline controls
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
            Signed in as {user.email}
          </p>
        </div>
        <button className="btn-ghost" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 text-brand-500 dark:text-brand-400 ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync Fixtures</h3>
              <p className="text-xs text-slate-500">Poll fixtures every 30 min</p>
            </div>
          </div>
          <button className="btn-primary w-full" onClick={handleFixtureSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <div className="mt-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Last sync</span>
              <span className="text-slate-600 dark:text-slate-300">{fixtureSyncInfo.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={fixtureSyncInfo.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : fixtureSyncInfo.status === 'error' ? 'text-red-500' : 'text-slate-500'}>
                {fixtureSyncInfo.status}
              </span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${hasLiveMatch ? 'bg-red-500/10 dark:bg-red-500/20' : 'bg-slate-500/10 dark:bg-slate-500/20'} flex items-center justify-center`}>
              <Radio className={`w-5 h-5 ${hasLiveMatch ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync Live</h3>
              <p className="text-xs text-slate-500">Updates every 30 sec (or within 60 min of kickoff)</p>
            </div>
          </div>
          <button className="btn-secondary w-full" onClick={handleLiveSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync Live'}
          </button>
          <div className="mt-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Live match</span>
              <span className={hasLiveMatch ? 'text-red-500 font-semibold' : 'text-slate-500'}>{hasLiveMatch ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last sync</span>
              <span className="text-slate-600 dark:text-slate-300">{liveSyncInfo.time}</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 dark:bg-gold-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-gold-500 dark:text-gold-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Run Simulation</h3>
              <p className="text-xs text-slate-500">30K Monte Carlo</p>
            </div>
          </div>
          <button className="btn-secondary w-full" onClick={handleRunSimulation} disabled={simRunning}>
            {simRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simRunning ? 'Running...' : 'Run Now'}
          </button>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-accent dark:text-accent-light" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync History</h3>
              <p className="text-xs text-slate-500">Historical WC data</p>
            </div>
          </div>
          <button className="btn-secondary w-full" onClick={handleSyncHistory}>
            <Database className="w-4 h-4" /> Sync History
          </button>
        </GlassPanel>
      </div>

      <RoundedCard hover={false}>
        <SectionHeader title="API Quota & Polling Mode" subtitle="Adaptive polling: 30 sec live / 30 min idle" icon={<Gauge className="w-5 h-5" />} />
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Daily API usage</span>
              <span className={`text-sm font-bold ${
                quotaMode === 'exhausted' ? 'text-red-500' : quotaMode === 'caution' ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}>{dailyCalls} / 2000</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quotaMode === 'exhausted' ? 'bg-red-500' : quotaMode === 'caution' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((dailyCalls / 2000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] font-medium ${
                quotaMode === 'exhausted' ? 'text-red-500' : quotaMode === 'caution' ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {quotaMode === 'exhausted' ? 'Budget exhausted — syncs paused' : quotaMode === 'caution' ? 'Caution — nearing limit' : 'Healthy'}
              </span>
              <span className="text-[10px] text-slate-400">Budget: 2000</span>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />

          <div className="grid grid-cols-3 gap-3">
            <div className={`p-3 rounded-xl text-center ${
              pollingMode === 'live' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30' : 'bg-slate-50 dark:bg-slate-800/50'
            }`}>
              <p className={`text-xs font-semibold ${pollingMode === 'live' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>Live Mode</p>
              <p className={`text-[10px] mt-0.5 ${pollingMode === 'live' ? 'text-red-500' : 'text-slate-400'}`}>Every 30 sec</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${
              pollingMode === 'window' ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30' : 'bg-slate-50 dark:bg-slate-800/50'
            }`}>
              <p className={`text-xs font-semibold ${pollingMode === 'window' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>Window Mode</p>
              <p className={`text-[10px] mt-0.5 ${pollingMode === 'window' ? 'text-amber-500' : 'text-slate-400'}`}>Every 30 sec (next 60 min)</p>
            </div>
            <div className={`p-3 rounded-xl text-center ${
              pollingMode === 'idle' ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/50'
            }`}>
              <p className={`text-xs font-semibold ${pollingMode === 'idle' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>Idle Mode</p>
              <p className={`text-[10px] mt-0.5 ${pollingMode === 'idle' ? 'text-emerald-500' : 'text-slate-400'}`}>Fixtures every 30 min</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Fixture sync runs every 30 min during idle periods. Live sync runs every 30 sec only when a match is live or due to kick off within the next 60 minutes.
  If the page still does not show fresh timestamps, verify the Supabase cron job and deployed Edge Function are both updated.
          </p>
        </div>
      </RoundedCard>

      <RoundedCard hover={false}>
        <SectionHeader title="Sync Health" subtitle="Provider status and last sync results" icon={<Activity className="w-5 h-5" />} />
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Provider</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{providerConfig?.provider_name || 'Not configured'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">API Base URL</span>
            <span className="font-mono text-xs text-slate-500">{providerConfig?.base_url || '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Competition ID</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{providerConfig?.competition_id ?? '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Provider Active</span>
            <span className={providerConfig?.is_active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
              {providerConfig?.is_active ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Last Fixture Sync</span>
            <span className={`font-semibold ${fixtureSyncInfo.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : fixtureSyncInfo.status === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
              {fixtureSyncInfo.status === 'success'
                ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {fixtureSyncInfo.time}</span>
                : fixtureSyncInfo.status === 'error'
                ? <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {fixtureSyncInfo.time}</span>
                : 'Never'}
            </span>
          </div>
          {fixtureSyncInfo.errorMsg && (
            <div className="ml-auto text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-1.5">
              {fixtureSyncInfo.errorMsg}
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Fixtures Updated (last run)</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fixtureSyncInfo.updated}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Last Live Sync</span>
            <span className={`font-semibold ${liveSyncInfo.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : liveSyncInfo.status === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
              {liveSyncInfo.time !== 'Never' ? liveSyncInfo.time : 'Never'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Live Match Now</span>
            <span className={hasLiveMatch ? 'text-red-500 font-semibold inline-flex items-center gap-1' : 'text-slate-500'}>
              {hasLiveMatch && <Zap className="w-3.5 h-3.5" />} {hasLiveMatch ? 'Yes — live sync polls every 30 sec' : 'No'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Provider Mode</span>
            <select
              value={providerMode}
              onChange={e => handleSetProviderMode(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="primary_only">Primary Only</option>
              <option value="fallback_on_failure">Fallback on Failure</option>
              <option value="backup_only">Backup Only</option>
            </select>
          </div>

          {lastFixtureMeta && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Last Sync Metadata</p>

              {lastFixtureMeta.http_status && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">HTTP Status</span>
                  <span className={`font-semibold ${lastFixtureMeta.http_status === 200 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {lastFixtureMeta.http_status}
                  </span>
                </div>
              )}

              {lastFixtureMeta.rate_limit_remaining !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">API Remaining Today</span>
                  <span className={`font-semibold ${
                    lastFixtureMeta.rate_limit_remaining > 20 ? 'text-emerald-600' :
                    lastFixtureMeta.rate_limit_remaining > 5 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {lastFixtureMeta.rate_limit_remaining} / {lastFixtureMeta.rate_limit_limit || '?'}
                  </span>
                </div>
              )}

              {lastFixtureMeta.results_count !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Fixtures in API Response</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{lastFixtureMeta.results_count}</span>
                </div>
              )}

              {lastFixtureMeta.api_message && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">API Message</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">{lastFixtureMeta.api_message}</span>
                </div>
              )}

              {lastFixtureMeta.request_url && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Request URL</span>
                  <span className="font-mono text-[9px] text-slate-500 max-w-[200px] truncate">{lastFixtureMeta.request_url}</span>
                </div>
              )}
            </>
          )}
        </div>
      </RoundedCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RoundedCard hover={false}>
          <SectionHeader title="Manual Score Override" subtitle="Enter final scores when API is unavailable" icon={<Edit3 className="w-5 h-5" />} />
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Home Team</label>
                <input
                  type="text"
                  value={overrideHome}
                  onChange={e => setOverrideHome(e.target.value.toUpperCase())}
                  placeholder="e.g. BRA"
                  maxLength={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Away Team</label>
                <input
                  type="text"
                  value={overrideAway}
                  onChange={e => setOverrideAway(e.target.value.toUpperCase())}
                  placeholder="e.g. ARG"
                  maxLength={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Home Score</label>
                <input
                  type="number"
                  value={overrideHomeScore}
                  onChange={e => setOverrideHomeScore(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Away Score</label>
                <input
                  type="number"
                  value={overrideAwayScore}
                  onChange={e => setOverrideAwayScore(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={e => setOverrideDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleOverrideScore}
              disabled={overrideSubmitting || !overrideHome || !overrideAway}
            >
              {overrideSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {overrideSubmitting ? 'Saving...' : 'Apply Manual Override'}
            </button>

            <p className="text-[10px] text-slate-400">
              Manual overrides are marked with data_source=manual and is_manual_override=true.
              Primary provider results can later overwrite manual data if they provide a completed result.
            </p>
          </div>
        </RoundedCard>

        <RoundedCard hover={false}>
          <SectionHeader title="Backup & Recompute" subtitle="Fallback sync and data recomputation" icon={<ArrowRight className="w-5 h-5" />} />
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Backup Provider</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                football-data.org — slower updates, no live tracking. Useful when API-Football is down or rate-limited.
                Requires FOOTBALL_DATA_ORG_KEY secret.
              </p>
              <button className="btn-secondary w-full text-sm" onClick={handleBackupSync} disabled={syncing}>
                <RefreshCw className="w-3.5 h-3.5" /> Run Backup Sync Now
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Recompute Standings</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                Recalculate group standings from existing fixture data. Use after manual overrides.
              </p>
              <button className="btn-secondary w-full text-sm" onClick={handleRecomputeStandings}>
                <Activity className="w-3.5 h-3.5" /> Recompute Now
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Current Provider Mode</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge text-[9px] ${
                  providerMode === 'primary_only' ? 'badge-brand' :
                  providerMode === 'fallback_on_failure' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                }`}>
                  {providerMode === 'primary_only' ? 'Primary Only' : providerMode === 'fallback_on_failure' ? 'Fallback on Failure' : providerMode === 'backup_only' ? 'Backup Only' : 'Not set'}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                {providerMode === 'primary_only' ? 'Only API-Football will be used. No fallback.' :
                 providerMode === 'fallback_on_failure' ? 'API-Football primary, football-data.org fallback on errors or empty responses.' :
                 providerMode === 'backup_only' ? 'Only football-data.org will be used. No API-Football calls.' :
                 'Provider mode not configured. Default: fallback on failure.'}
              </p>
            </div>
          </div>
        </RoundedCard>
      </div>

      <RoundedCard hover={false}>
        <SectionHeader title="Database Statistics" subtitle="Record counts across all tables" icon={<Database className="w-5 h-5" />} />
        <div className="flex justify-end mb-2">
          <button className="btn-ghost text-xs" onClick={loadStats} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
          </button>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Tournaments', value: stats.tournaments, color: 'text-brand-600 dark:text-brand-400' },
              { label: 'Teams', value: stats.teams, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Matches', value: stats.matches, color: 'text-gold-600 dark:text-gold-400' },
              { label: 'Stages', value: stats.stages, color: 'text-accent dark:text-accent-light' },
              { label: 'Standings', value: stats.group_standings, color: 'text-rose-600 dark:text-rose-400' },
              { label: 'Tournament Teams', value: stats.tournament_teams, color: 'text-sky-600 dark:text-sky-400' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-3 text-center">
                <div className={`text-2xl font-bold ${item.color}`}>{item.value.toLocaleString()}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-10">
            {loading ? (
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <p className="text-sm text-slate-500">Click "Refresh" to load database statistics.</p>
            )}
          </div>
        )}
      </RoundedCard>

      <RoundedCard hover={false}>
        <SectionHeader title="Diagnostics" subtitle="Current data and simulation status" icon={<Activity className="w-5 h-5" />} />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{WC2026_TEAMS.length}</p>
            <p className="text-[10px] text-slate-400">2026 Teams</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{GROUP_NAMES.length}</p>
            <p className="text-[10px] text-slate-400">Groups</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.matches ?? '--'}
            </p>
            <p className="text-[10px] text-slate-400">Historical Matches</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{providerConfig?.provider_name || '--'}</p>
            <p className="text-[10px] text-slate-400">Provider</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Model Version</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Elo-Poisson-DC-v1.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Prediction Engine</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Elo + Poisson + Dixon-Coles</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">API Key Status</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">Requires API_FOOTBALL_KEY secret</span>
          </div>
        </div>
      </RoundedCard>

      <RoundedCard hover={false}>
        <SectionHeader title="System Logs" subtitle="Recent activity" />
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 font-mono text-xs text-slate-500 dark:text-slate-400 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p>No activity yet. Use the buttons above to trigger actions.</p>
          ) : (
            logs.map((l, i) => (
              <div
                key={i}
                className={`flex gap-3 py-1 ${
                  l.status === 'error'
                    ? 'text-red-500 dark:text-red-400'
                    : l.status === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="opacity-70 shrink-0">[{l.timestamp}]</span>
                <span className="shrink-0 font-semibold">{l.action}</span>
                <span className="break-words">{l.message}</span>
              </div>
            ))
          )}
        </div>
      </RoundedCard>
    </div>
  );
}
