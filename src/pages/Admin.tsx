import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Play, RefreshCw, CheckCircle2, AlertCircle, Loader2, Activity, Clock } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import RoundedCard from '../components/RoundedCard';
import GlassPanel from '../components/GlassPanel';
import { supabase } from '../lib/supabase';
import { WC2026_FIXTURES } from '../data/fixtures2026';
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

export default function Admin() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [simRunning, setSimRunning] = useState(false);

  const addLog = useCallback((entry: Omit<SyncLog, 'timestamp'>) => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ...entry,
    }, ...prev].slice(0, 50));
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    addLog({ action: 'Load Stats', status: 'info', message: 'Fetching database record counts...' });
    try {
      const tables = ['tournaments', 'teams', 'matches', 'stages', 'group_standings', 'tournament_teams'] as const;
      const counts = await Promise.all(
        tables.map(async table => {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
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
  }, [addLog]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleSync() {
    setSyncing(true);
    addLog({ action: 'Sync History', status: 'info', message: 'Starting historical data sync...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      addLog({
        action: 'Sync History',
        status: 'success',
        message: data.message || 'Sync completed',
        inserted: data.inserted,
        updated: data.updated,
        errors: data.errors,
      });
      loadStats();
    } catch (err: any) {
      const msg = err.message || 'Sync failed';
      addLog({ action: 'Sync History', status: 'error', message: msg, errors: 1 });
    } finally {
      setSyncing(false);
    }
  }

  function handleRunSimulation() {
    setSimRunning(true);
    addLog({ action: 'Run Simulation', status: 'info', message: 'Starting 30K Monte Carlo simulation...' });
    // Run simulation in next tick to not block UI
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

  // Diagnostics
  const completedMatches = WC2026_FIXTURES.filter(f => f.status === 'completed').length;
  const scheduledMatches = WC2026_FIXTURES.filter(f => f.status === 'scheduled').length;
  const totalFixtures = WC2026_FIXTURES.length;

  const lastSyncLog = logs.find(l => l.action === 'Sync History');
  const lastSyncStatus = lastSyncLog?.status;
  const lastSyncTime = lastSyncLog?.timestamp;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Model management and data pipeline controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Run Simulation */}
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
              <Play className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Run Simulation</h3>
              <p className="text-xs text-slate-500">30K Monte Carlo group stage</p>
            </div>
          </div>
          <button className="btn-primary w-full" onClick={handleRunSimulation} disabled={simRunning}>
            {simRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {simRunning ? 'Running...' : 'Run Now'}
          </button>
        </GlassPanel>

        {/* Sync History */}
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 dark:bg-gold-500/20 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 text-gold-500 dark:text-gold-400 ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync History</h3>
              <p className="text-xs text-slate-500">Import World Cup data</p>
            </div>
          </div>
          <button className="btn-secondary w-full" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          {lastSyncTime && (
            <div className={`mt-3 flex items-center gap-2 text-xs p-2 rounded-lg ${
              lastSyncStatus === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : lastSyncStatus === 'error'
                ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                : 'bg-slate-50 dark:bg-slate-700 text-slate-500'
            }`}>
              {lastSyncStatus === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : lastSyncStatus === 'error' ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Activity className="w-3.5 h-3.5 shrink-0" />}
              <span>Last sync: {lastSyncTime} — {lastSyncLog?.message}</span>
            </div>
          )}
          {!lastSyncTime && !syncing && (
            <div className="mt-3 flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>No sync attempted yet</span>
            </div>
          )}
        </GlassPanel>

        {/* Database Stats */}
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-accent dark:text-accent-light" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Database</h3>
              <p className="text-xs text-slate-500">Current record counts</p>
            </div>
          </div>
          <button className="btn-secondary w-full" onClick={loadStats} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {loading ? 'Loading...' : 'Refresh Stats'}
          </button>
        </GlassPanel>
      </div>

      {/* Database Stats Table */}
      <RoundedCard hover={false}>
        <SectionHeader title="Database Statistics" subtitle="Record counts across all tables" icon={<Database className="w-5 h-5" />} />
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-2">
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
              <p className="text-sm text-slate-500">Click "Refresh Stats" to load database statistics.</p>
            )}
          </div>
        )}
      </RoundedCard>

      {/* Diagnostics */}
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
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedMatches}</p>
            <p className="text-[10px] text-slate-400">Completed</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{scheduledMatches}</p>
            <p className="text-[10px] text-slate-400">Scheduled</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Total Fixtures</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalFixtures}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Model Version</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Elo-Poisson-DC-v1.0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Simulation Default</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">30,000 runs</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Prediction Engine</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Elo + Poisson + Dixon-Coles</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">DB Historical Matches</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats?.matches ?? '--'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Last Sync Attempt</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{lastSyncTime || 'Never'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Last Sync Result</span>
            <span className={`font-semibold ${lastSyncStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : lastSyncStatus === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
              {lastSyncStatus === 'success' ? 'Success' : lastSyncStatus === 'error' ? 'Error' : 'N/A'}
            </span>
          </div>
        </div>
      </RoundedCard>

      {/* System Logs */}
      <RoundedCard hover={false}>
        <SectionHeader title="System Logs" subtitle="Recent activity" />
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 font-mono text-xs text-slate-500 dark:text-slate-400 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p>No activity yet. Use the buttons above to trigger actions.</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={`flex gap-3 py-0.5 ${l.status === 'error' ? 'text-red-500 dark:text-red-400' : l.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                <span className="text-slate-400 shrink-0">{l.timestamp}</span>
                <span className="shrink-0">[{l.action}]</span>
                <span>{l.message}</span>
                {l.inserted !== undefined && <span className="text-slate-400 ml-2">+{l.inserted} inserted</span>}
                {l.updated !== undefined && <span className="text-slate-400 ml-2">~{l.updated} updated</span>}
                {l.errors !== undefined && l.errors > 0 && <span className="text-red-400 ml-2">{l.errors} errors</span>}
              </div>
            ))
          )}
        </div>
      </RoundedCard>
    </div>
  );
}
