import { useState, useEffect, useCallback } from 'react';
import { Database, Play, RefreshCw, CheckCircle2, AlertCircle, Loader2, Activity, Clock, Radio, Zap } from 'lucide-react';
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

export default function Admin() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const {
    providerConfig,
    lastFixtureSync,
    lastLiveSync,
    hasLiveMatch,
    syncing,
    triggerSync,
    refetch: refetchSyncData,
  } = useWC2026Fixtures();

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
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
          if (error) throw error;
          return count || 0;
        })
      );
      setStats({
        tournaments: counts[0], teams: counts[1], matches: counts[2],
        stages: counts[3], group_standings: counts[4], tournament_teams: counts[5],
      });
      addLog({ action: 'Load Stats', status: 'success', message: `Loaded counts for ${tables.length} tables` });
    } catch (err: any) {
      addLog({ action: 'Load Stats', status: 'error', message: err.message || 'Failed to load stats', errors: 1 });
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function handleSyncHistory() {
    addLog({ action: 'Sync History', status: 'info', message: 'Starting historical data sync...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
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
        addLog({ action: 'Run Simulation', status: 'success', message: `Completed ${result.simulationRuns.toLocaleString()} runs (${result.modelVersion})` });
      } catch (err: any) {
        addLog({ action: 'Run Simulation', status: 'error', message: err.message || 'Simulation failed', errors: 1 });
      } finally {
        setSimRunning(false);
      }
    }, 100);
  }

  // Format sync run info
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Model management and data pipeline controls</p>
      </div>

      {/* Sync Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sync Fixtures */}
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center">
              <RefreshCw className={`w-5 h-5 text-brand-500 dark:text-brand-400 ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync Fixtures</h3>
              <p className="text-xs text-slate-500">Poll API-Football (30-60 min)</p>
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

        {/* Sync Live */}
        <GlassPanel>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${hasLiveMatch ? 'bg-red-500/10 dark:bg-red-500/20' : 'bg-slate-500/10 dark:bg-slate-500/20'} flex items-center justify-center`}>
              <Radio className={`w-5 h-5 ${hasLiveMatch ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Sync Live</h3>
              <p className="text-xs text-slate-500">Live match updates (30s)</p>
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

        {/* Run Simulation */}
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

        {/* Sync History */}
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

      {/* Sync Health */}
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
              {fixtureSyncInfo.status === 'success' ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {fixtureSyncInfo.time}</span> : fixtureSyncInfo.status === 'error' ? <span className="inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {fixtureSyncInfo.time}</span> : 'Never'}
            </span>
          </div>
          {fixtureSyncInfo.errorMsg && (
            <div className="ml-auto text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-1.5">{fixtureSyncInfo.errorMsg}</div>
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
              {hasLiveMatch && <Zap className="w-3.5 h-3.5" />} {hasLiveMatch ? 'Yes — live sync should poll every 30s' : 'No'}
            </span>
          </div>
        </div>
      </RoundedCard>

      {/* Database Stats */}
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
