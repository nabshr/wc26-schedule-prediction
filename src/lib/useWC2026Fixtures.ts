import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabase';
import { WC2026_FIXTURES, WC2026Fixture, STAGE_LABELS } from '../data/fixtures2026';

interface SyncedFixture {
  id: string;
  provider_fixture_id: number | null;
  match_number: number | null;
  stage: string;
  group_name: string | null;
  matchday: number;
  kickoff_utc: string | null;
  venue: string | null;
  city: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  match_status: string;
  status_detail: string | null;
  match_minute: number | null;
  winner_code: string | null;
  last_synced_at: string | null;
}

interface SyncRun {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  fixtures_updated: number;
  error_count: number;
  last_error: string | null;
  is_live_match: boolean;
  metadata: Record<string, any> | null;
}

interface ProviderConfig {
  provider_name: string;
  base_url: string;
  competition_id: number;
  season: number;
  is_active: boolean;
  provider_mode: string;
}

export interface MergedFixture extends WC2026Fixture {
  matchMinute: number | null;
  statusDetail: string | null;
  winnerCode: string | null;
  lastSyncedAt: string | null;
  syncedFromProvider: boolean;
}

// Convert synced fixture to merged fixture format
function syncedToMerged(sf: SyncedFixture): MergedFixture {
  const kickoff = sf.kickoff_utc ? new Date(sf.kickoff_utc) : null;
  const date = kickoff ? kickoff.toISOString().split('T')[0] : '';
  const timeUTC = kickoff
    ? `${String(kickoff.getUTCHours()).padStart(2, '0')}:${String(kickoff.getUTCMinutes()).padStart(2, '0')}`
    : '';

  return {
    id: sf.match_number || 0,
    home: sf.home_team_code,
    away: sf.away_team_code,
    group: sf.group_name || '',
    matchday: sf.matchday,
    date,
    timeUTC,
    venue: sf.venue || '',
    city: sf.city || '',
    stage: sf.stage as WC2026Fixture['stage'],
    status: sf.match_status as WC2026Fixture['status'],
    homeScore: sf.home_score,
    awayScore: sf.away_score,
    matchMinute: sf.match_minute,
    statusDetail: sf.status_detail,
    winnerCode: sf.winner_code,
    lastSyncedAt: sf.last_synced_at,
    syncedFromProvider: true,
  };
}

export function useWC2026Fixtures() {
  const [syncedFixtures, setSyncedFixtures] = useState<SyncedFixture[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchSyncedData = useCallback(async () => {
    setLoading(true);
    try {
      const [fixturesRes, runsRes, configRes] = await Promise.all([
        supabase.from('wc2026_fixtures').select('*').order('kickoff_utc', { ascending: true }),
        supabase.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(10),
        supabase.from('provider_config').select('*').eq('is_active', true).limit(1),
      ]);

      if (fixturesRes.data) setSyncedFixtures(fixturesRes.data as SyncedFixture[]);
      if (runsRes.data) setSyncRuns(runsRes.data as SyncRun[]);
      if (configRes.data && configRes.data.length > 0) setProviderConfig(configRes.data[0] as ProviderConfig);
    } catch (err) {
      console.error('Failed to fetch synced data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSyncedData(); }, [fetchSyncedData]);

  // Merge: Supabase-synced data overrides static data where available
  const { mergedFixtures, consumedSyncedKeys } = useMemo(() => {
    if (syncedFixtures.length === 0) {
      return {
        mergedFixtures: WC2026_FIXTURES.map(f => ({
          ...f,
          matchMinute: null,
          statusDetail: null,
          winnerCode: null,
          lastSyncedAt: null,
          syncedFromProvider: false,
        })) as MergedFixture[],
        consumedSyncedKeys: new Set<string>(),
      };
    }

    // Build lookup from synced fixtures by match_number, team+date, or team pairing alone
    const syncedByMatchNumber = new Map<number, SyncedFixture>();
    const syncedByTeams = new Map<string, SyncedFixture>();
    const syncedByTeamPair = new Map<string, SyncedFixture>();

    for (const sf of syncedFixtures) {
      if (sf.match_number) syncedByMatchNumber.set(sf.match_number, sf);
      const dateKey = `${sf.home_team_code}-${sf.away_team_code}-${sf.kickoff_utc?.slice(0, 10)}`;
      syncedByTeams.set(dateKey, sf);
      const pairKey = `${sf.home_team_code}-${sf.away_team_code}`;
      syncedByTeamPair.set(pairKey, sf);
    }

    const consumed = new Set<string>();

    // Map static fixtures to merged, preferring synced data
    const merged = WC2026_FIXTURES.map(staticF => {
      let synced = syncedByMatchNumber.get(staticF.id);
      if (!synced) {
        const key = `${staticF.home}-${staticF.away}-${staticF.date}`;
        synced = syncedByTeams.get(key);
      }
      if (!synced) {
        // Fallback: match by team pair alone (handles UTC date-boundary
        // differences between static schedule and provider kickoff times)
        const pairKey = `${staticF.home}-${staticF.away}`;
        synced = syncedByTeamPair.get(pairKey);
      }

      if (synced) {
        consumed.add(synced.id);
        // Preserve static metadata (venue, city, group, matchday) since
        // football-data.org doesn't provide these; overlay live score/status.
        const syncedMerged = syncedToMerged(synced);
        return {
          ...staticF,
          ...syncedMerged,
          id: staticF.id,
          venue: syncedMerged.venue || staticF.venue,
          city: syncedMerged.city || staticF.city,
          group: syncedMerged.group || staticF.group,
          matchday: syncedMerged.matchday || staticF.matchday,
        };
      }

      return {
        ...staticF,
        matchMinute: null,
        statusDetail: null,
        winnerCode: null,
        lastSyncedAt: null,
        syncedFromProvider: false,
      };
    });

    return { mergedFixtures: merged as MergedFixture[], consumedSyncedKeys: consumed };
  }, [syncedFixtures]);

  // Also include any synced fixtures not matched to static data (e.g. newly scheduled knockout matches)
  const allFixtures = useMemo(() => {
    const extras = syncedFixtures
      .filter(sf => !consumedSyncedKeys.has(sf.id))
      .map(sf => syncedToMerged(sf));
    return [...mergedFixtures, ...extras];
  }, [mergedFixtures, syncedFixtures, consumedSyncedKeys]);

  // Get latest sync run of each type
  const lastFixtureSync = syncRuns.find(r => r.sync_type === 'fixtures');
  const lastLiveSync = syncRuns.find(r => r.sync_type === 'live');

  // Check if any match is currently live
  const hasLiveMatch = allFixtures.some(f => f.status === 'live');

  // Trigger sync via edge function
  const triggerSync = useCallback(async (type: 'fixtures' | 'live') => {
    setSyncing(true);
    try {
      const fnName = type === 'fixtures' ? 'sync-fixtures' : 'sync-live';
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const data = await res.json();
      await fetchSyncedData();
      return { success: res.ok, message: data.message || data.error || 'Sync completed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Sync failed' };
    } finally {
      setSyncing(false);
    }
  }, [fetchSyncedData]);

  return {
    fixtures: allFixtures,
    syncRuns,
    providerConfig,
    lastFixtureSync,
    lastLiveSync,
    hasLiveMatch,
    loading,
    syncing,
    triggerSync,
    refetch: fetchSyncedData,
  };
}
