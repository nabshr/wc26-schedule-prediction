import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEAM_MAP: Record<string, string> = {
  "Mexico": "MEX", "Czechia": "CZE", "Czech Republic": "CZE",
  "South Africa": "RSA", "Korea Republic": "KOR", "South Korea": "KOR",
  "Canada": "CAN", "Switzerland": "SUI", "Qatar": "QAT",
  "Bosnia and Herzegovina": "BIH", "Bosnia-Herzegovina": "BIH",
  "Brazil": "BRA", "Scotland": "SCO", "Morocco": "MAR",
  "Haiti": "HAI", "USA": "USA", "United States": "USA",
  "Turkey": "TUR", "Turkiye": "TUR", "Paraguay": "PAR",
  "Australia": "AUS", "Germany": "GER", "Ecuador": "ECU",
  "Ivory Coast": "CIV", "Cote d'Ivoire": "CIV", "Curacao": "CUW",
  "Netherlands": "NED", "Sweden": "SWE", "Tunisia": "TUN",
  "Curaçao": "CUW", "Cape Verde Islands": "CPV",
  "Japan": "JPN", "Belgium": "BEL", "Iran": "IRN",
  "Egypt": "EGY", "New Zealand": "NZL", "Spain": "ESP",
  "Uruguay": "URU", "Saudi Arabia": "KSA", "Cabo Verde": "CPV",
  "Cape Verde": "CPV", "France": "FRA", "Norway": "NOR",
  "Senegal": "SEN", "Iraq": "IRQ", "Argentina": "ARG",
  "Austria": "AUT", "Algeria": "ALG", "Jordan": "JOR",
  "Portugal": "POR", "Colombia": "COL", "DR Congo": "COD",
  "Congo DR": "COD", "Uzbekistan": "UZB", "England": "ENG",
  "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN",
};

function mapStage(round: string): string {
  const r = round.toLowerCase();
  if (r.includes("group") || r.includes("league")) return "group";
  if (r.includes("round of 32") || r.includes("1/32") || r.includes("32")) return "r32";
  if (r.includes("round of 16") || r.includes("1/16") || r.includes("16")) return "r16";
  if (r.includes("quarter") || r.includes("1/4")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("3rd") || r.includes("third")) return "third";
  if (r.includes("final")) return "final";
  return "group";
}

function mapStatus(shortStatus: string, longStatus: string): string {
  const s = shortStatus?.toLowerCase() || "";
  if (s === "ft" || s === "aet" || s === "pen" || s === "awd" || s === "wo") return "completed";
  if (["1h", "2h", "ht", "et", "bt", "p", "susd", "int", "live"].includes(s)) return "live";
  if (s === "ns" || s === "tbd") return "scheduled";
  if (s === "pst" || s === "canc" || s === "abd") return "postponed";
  return "scheduled";
}

function resolveTeamCode(name: string): string | null {
  return TEAM_MAP[name] || null;
}

function getMatchMinute(fixture: any): number | null {
  const status = fixture.fixture?.status?.short?.toLowerCase();
  if (!status || status === "ns" || status === "ft") return null;
  return fixture.fixture?.status?.elapsed || null;
}

const DAILY_API_BUDGET = 2000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let forceBackup = false;
  try {
    const body = await req.json();
    forceBackup = body?.force_backup === true;
  } catch {}

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "API_FOOTBALL_KEY not configured.",
    }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Rate limit guard
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayApiCalls } = await supabase
    .from("sync_runs")
    .select("*", { count: "exact", head: true })
    .in("sync_type", ["fixtures", "live"])
    .in("status", ["success", "running"])
    .gte("started_at", todayStart.toISOString());

  if ((todayApiCalls || 0) >= DAILY_API_BUDGET) {
    return new Response(JSON.stringify({
      message: `Daily API budget reached (${todayApiCalls}/${DAILY_API_BUDGET}). Skipping.`,
      status: "rate_limited",
      daily_calls: todayApiCalls,
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Concurrency guard
  const { data: runningSyncs } = await supabase
    .from("sync_runs")
    .select("id")
    .eq("sync_type", "fixtures")
    .eq("status", "running")
    .gt("started_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (runningSyncs && runningSyncs.length > 0) {
    return new Response(JSON.stringify({
      message: "Sync already in progress. Skipping.",
      status: "skipped",
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Create sync run
  const initialProvider = forceBackup ? "football-data.org" : "api-football";

  const { data: syncRun } = await supabase
    .from("sync_runs")
    .insert({
      sync_type: "fixtures",
      provider_name: initialProvider,
      status: "running",
      metadata: {
        force_backup: forceBackup,
        primary_attempted: !forceBackup,
        fallback_attempted: false,
        provider_used: initialProvider,
      },
    })
    .select("id")
    .single();


  const syncRunId = syncRun?.id;

  try {
    const { data: config } = await supabase
      .from("provider_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    const competitionId = config?.competition_id || 1;
    const season = config?.season || 2026;
    const baseUrl = config?.base_url || "https://v3.football.api-sports.io";
    const providerMode = config?.provider_mode || "fallback_on_failure";

    if (forceBackup || providerMode === "backup_only") {
      return await tryBackupProvider(supabase, syncRunId, "fixtures", {
        force_backup: forceBackup,
        provider_mode: providerMode,
        primary_skipped: true,
      });
    }


    const requestUrl = `${baseUrl}/fixtures?league=${competitionId}&season=${season}`;

    const response = await fetch(requestUrl, {
      headers: { "x-apisports-key": apiKey },
    });

    // Capture rate-limit headers from API-Football
    const providerMeta: Record<string, any> = {
      request_url: requestUrl,
      http_status: response.status,
      league: competitionId,
      season: season,
    };

    // API-Football returns rate-limit info in headers
    const remaining = response.headers.get("x-ratelimit-requests-remaining");
    const limit = response.headers.get("x-ratelimit-requests-limit");
    if (remaining) providerMeta.rate_limit_remaining = parseInt(remaining);
    if (limit) providerMeta.rate_limit_limit = parseInt(limit);

    if (!response.ok) {
      const errBody = await response.text();
      providerMeta.error_body = errBody.slice(0, 500);
      await supabase
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          last_error: `API-Football HTTP ${response.status}`,
          error_count: 1,
          metadata: providerMeta,
        })
        .eq("id", syncRunId);

      // If primary fails and fallback mode, try backup
      if (providerMode === "fallback_on_failure" || providerMode === "backup_only") {
        return await tryBackupProvider(supabase, syncRunId, "fixtures", providerMeta);
      }

      return new Response(JSON.stringify({
        error: `API-Football HTTP ${response.status}`,
        provider_meta: providerMeta,
      }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const data = await response.json();

    // API-Football wraps results: { response: [...], results: N }
    const apiFixtures = data.response || [];
    providerMeta.results_count = data.results ?? apiFixtures.length;
    providerMeta.api_message = data.message || null;
    providerMeta.api_errors = data.errors || null;

    // If primary returned 0 fixtures and fallback mode, try backup
    if (apiFixtures.length === 0 && (providerMode === "fallback_on_failure")) {
      providerMeta.primary_empty = true;
      return await tryBackupProvider(supabase, syncRunId, "fixtures", providerMeta);
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    let skipped = 0;
    let unmappedTeams: string[] = [];
    let hasLiveMatch = false;

    for (const fixture of apiFixtures) {
      try {
        const homeName = fixture.teams?.home?.name;
        const awayName = fixture.teams?.away?.name;
        const homeCode = resolveTeamCode(homeName);
        const awayCode = resolveTeamCode(awayName);

        if (!homeCode || !awayCode) {
          if (!homeCode && homeName) unmappedTeams.push(homeName);
          if (!awayCode && awayName) unmappedTeams.push(awayName);
          skipped++;
          continue;
        }

        const kickoff = fixture.fixture?.date;
        const shortStatus = fixture.fixture?.status?.short || "NS";
        const longStatus = fixture.fixture?.status?.long || "";
        const matchStatus = mapStatus(shortStatus, longStatus);

        if (matchStatus === "live") hasLiveMatch = true;

        const round = fixture.league?.round || "";
        const stage = mapStage(round);
        const groupName = stage === "group"
          ? round.replace(/[^A-L]/g, "").slice(-1) || null
          : null;

        const matchMinute = getMatchMinute(fixture);
        const homeScore = fixture.goals?.home ?? null;
        const awayScore = fixture.goals?.away ?? null;
        const providerFixtureId = fixture.fixture?.id;

        let winnerCode: string | null = null;
        if (matchStatus === "completed" && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winnerCode = homeCode;
          else if (awayScore > homeScore) winnerCode = awayCode;
          else winnerCode = "draw";
        }

        const row = {
          provider_fixture_id: providerFixtureId,
          stage,
          group_name: groupName,
          matchday: null,
          kickoff_utc: kickoff,
          venue: fixture.fixture?.venue?.name || null,
          city: fixture.fixture?.venue?.city || null,
          home_team_code: homeCode,
          away_team_code: awayCode,
          home_score: homeScore,
          away_score: awayScore,
          match_status: matchStatus,
          status_detail: shortStatus,
          match_minute: matchMinute,
          winner_code: winnerCode,
          last_synced_at: new Date().toISOString(),
          raw_payload: fixture,
          data_source: "api-football",
        };

        const { error: upsertError } = await supabase
          .from("wc2026_fixtures")
          .upsert(row, {
            onConflict: "provider_fixture_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          errors++;
        } else {
          updated++;
        }
      } catch {
        errors++;
      }
    }

    // Recompute group standings
    if (apiFixtures.length > 0) {
      await recomputeStandings(supabase);
    }

    providerMeta.inserted = inserted;
    providerMeta.updated = updated;
    providerMeta.skipped = skipped;
    providerMeta.unmappedTeams = [...new Set(unmappedTeams)];

    await supabase
      .from("sync_runs")
      .update({
        status: errors > 0 && updated === 0 ? "error" : "success",
        finished_at: new Date().toISOString(),
        fixtures_fetched: apiFixtures.length,
        fixtures_inserted: inserted,
        fixtures_updated: updated,
        error_count: errors,
        is_live_match: hasLiveMatch,
        metadata: providerMeta,
      })
      .eq("id", syncRunId);

    await triggerLiveSyncIfNeeded(supabase);

    return new Response(JSON.stringify({
      message: `Sync completed: ${apiFixtures.length} fetched, ${updated} upserted, ${errors} errors, ${skipped} skipped`,
      fixtures_fetched: apiFixtures.length,
      fixtures_updated: updated,
      errors,
      skipped,
      hasLiveMatch,
      unmappedTeams: [...new Set(unmappedTeams)],
      daily_calls: (todayApiCalls || 0) + 1,
      provider_meta: providerMeta,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        last_error: err.message,
        error_count: 1,
      })
      .eq("id", syncRunId);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

// Backup provider: football-data.org
async function tryBackupProvider(
  supabase: any,
  syncRunId: string,
  syncType: string,
  primaryMeta: Record<string, any>
) {
  const backupKey = Deno.env.get("FOOTBALL_DATA_ORG_KEY");
  if (!backupKey) {
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        last_error: "Primary returned empty/error and no FOOTBALL_DATA_ORG_KEY configured for fallback",
        error_count: 1,
        metadata: { ...primaryMeta, fallback_attempted: true, fallback_available: false },
      })
      .eq("id", syncRunId);

    return new Response(JSON.stringify({
      error: "Primary failed and no backup key configured. Set FOOTBALL_DATA_ORG_KEY secret.",
      primary_meta: primaryMeta,
    }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const backupMeta: Record<string, any> = {
    provider: "football-data.org",
    fallback_for: "api-football",
    primary_meta: primaryMeta,
  };

  try {
    // football-data.org World Cup 2026 competition
    const url = "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: { "X-Auth-Token": backupKey },
      });
    } catch (fetchErr: any) {
      // Transient network/HTTP2 connection errors: wait briefly and retry once
      backupMeta.first_attempt_error = fetchErr?.message || String(fetchErr);
      await new Promise(r => setTimeout(r, 1000));
      resp = await fetch(url, {
        headers: { "X-Auth-Token": backupKey },
      });
    }

    backupMeta.http_status = resp.status;
    backupMeta.request_url = url;

    if (!resp.ok) {
      const errBody = await resp.text();
      backupMeta.error_body = errBody.slice(0, 500);
      await supabase
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          last_error: `Backup provider HTTP ${resp.status}`,
          error_count: 1,
          metadata: backupMeta,
        })
        .eq("id", syncRunId);

      return new Response(JSON.stringify({
        error: `Both primary and backup failed. Backup HTTP ${resp.status}`,
        backup_meta: backupMeta,
      }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const data = await resp.json();
    const matches = data.matches || [];
    backupMeta.matches_count = matches.length;

    let updated = 0;
    let errors = 0;
    let skipped = 0;
    let unmappedTeams: string[] = [];
    let insertErrorSamples: string[] = [];

    for (const match of matches) {
      try {
        // football-data.org uses different team name format
        const homeName = match.homeTeam?.name || match.homeTeam?.shortName;
        const awayName = match.awayTeam?.name || match.awayTeam?.shortName;
        const homeCode = resolveTeamCode(homeName);
        const awayCode = resolveTeamCode(awayName);

        if (!homeCode || !awayCode) {
          if (!homeCode && homeName) unmappedTeams.push(homeName);
          if (!awayCode && awayName) unmappedTeams.push(awayName);
          skipped++;
          continue;
        }

        const kickoff = match.utcDate;
        const status = match.status; // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, CANCELLED
        let matchStatus = "scheduled";
        if (status === "FINISHED") matchStatus = "completed";
        else if (status === "IN_PLAY" || status === "PAUSED") matchStatus = "live";
        else if (status === "POSTPONED" || status === "CANCELLED") matchStatus = "postponed";

        const homeScore = match.score?.fullTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? null;
        const matchday = match.matchday || null;

        let winnerCode: string | null = null;
        if (matchStatus === "completed" && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winnerCode = homeCode;
          else if (awayScore > homeScore) winnerCode = awayCode;
          else winnerCode = "draw";
        }

        // Derive stage and group from football-data.org match
        const group = match.group; // e.g. "Group A"
        let stage = "group";
        let groupName: string | null = null;
        if (group) {
          const groupLetter = group.replace(/[^A-L]/g, "").slice(-1) || null;
          groupName = groupLetter;
          stage = "group";
        } else {
          // Knockout stage - try to map
          const stageStr = (match.stage || "").toLowerCase();
          if (stageStr.includes("round_of_32") || stageStr.includes("last_32")) stage = "r32";
          else if (stageStr.includes("round_of_16") || stageStr.includes("last_16")) stage = "r16";
          else if (stageStr.includes("quarter")) stage = "qf";
          else if (stageStr.includes("semi")) stage = "sf";
          else if (stageStr.includes("third") || stageStr.includes("3rd")) stage = "third";
          else if (stageStr.includes("final")) stage = "final";
        }

        const providerFixtureId = `fd-${match.id}`;

        // Only upsert if no existing record from primary provider, or this is clearly newer
        let { data: existing } = await supabase
          .from("wc2026_fixtures")
          .select("id, home_score, away_score, match_status, kickoff_utc")
          .eq("home_team_code", homeCode).eq("away_team_code", awayCode)
          .eq("kickoff_utc", kickoff).limit(1).maybeSingle();

        // Fallback: team-pair ignoring exact time (handles UTC date-boundary mismatches)
        if (!existing) {
          const kickoffDate = kickoff.slice(0, 10);
          const dayBefore = new Date(new Date(kickoff).getTime() - 86400000).toISOString().slice(0, 10);
          const dayAfter  = new Date(new Date(kickoff).getTime() + 86400000).toISOString().slice(0, 10);
          const { data: fallback } = await supabase
            .from("wc2026_fixtures")
            .select("id, home_score, away_score, match_status, kickoff_utc")
            .eq("home_team_code", homeCode).eq("away_team_code", awayCode)
            .gte("kickoff_utc", `${dayBefore}T00:00:00Z`)
            .lte("kickoff_utc", `${dayAfter}T23:59:59Z`)
            .limit(1).maybeSingle();
          existing = fallback;
        }

        // Priority: primary > backup. Only write if no existing primary record
        if (existing && existing.data_source === "api-football") {
          skipped++;
          continue;
        }

        // Don't blank out existing scores
        if (existing) {
          // Never downgrade a completed match back to live/scheduled
          if (existing.match_status === 'completed' && matchStatus !== 'completed') { skipped++; continue; }
          // Never blank out scores
          if (homeScore === null && existing.home_score !== null) { skipped++; continue; }
        }

        const row: Record<string, any> = {
          provider_fixture_id: providerFixtureId,
          stage,
          group_name: groupName,
          matchday,
          kickoff_utc: kickoff,
          venue: null,
          city: null,
          home_team_code: homeCode,
          away_team_code: awayCode,
          home_score: homeScore,
          away_score: awayScore,
          match_status: matchStatus,
          status_detail: status,
          match_minute: null,
          winner_code: winnerCode,
          last_synced_at: new Date().toISOString(),
          data_source: "football-data.org",
        };

        // Use provider_fixture_id for upsert if no conflict; otherwise match on teams+kickoff
        if (existing) {
          const { error: updateError } = existing?.id
            ? await supabase.from("wc2026_fixtures").update(row).eq("id", existing.id)
            : await supabase.from("wc2026_fixtures").update(row)
                .eq("home_team_code", homeCode).eq("away_team_code", awayCode)
                .eq("kickoff_utc", kickoff);

          if (updateError) {
            errors++;
            insertErrorSamples.push(updateError.message);
          } else {
            updated++;
          }
        } else {
          const { error: insertError } = await supabase
            .from("wc2026_fixtures")
            .insert(row);
          if (insertError) {
            errors++;
            insertErrorSamples.push(insertError.message);
          } else {
            updated++;
          }
        }
      } catch (e: any) {
        errors++;
        insertErrorSamples.push(e?.message || String(e));
      }
    }

    if (updated > 0) {
      await recomputeStandings(supabase);
    }

    backupMeta.updated = updated;
    backupMeta.skipped = skipped;
    backupMeta.errors = errors;
    backupMeta.insertErrorSamples = insertErrorSamples.slice(0, 5);
    backupMeta.unmappedTeams = [...new Set(unmappedTeams)];

    await supabase
    .from("sync_runs")
    .update({
      provider_name: "football-data.org",
      status: updated > 0 ? "success" : "error",
      finished_at: new Date().toISOString(),
      fixtures_fetched: matches.length,
      fixtures_updated: updated,
      error_count: errors,
      metadata: {
        ...backupMeta,
        provider_used: "football-data.org",
        fallback_attempted: true,
        fallback_succeeded: updated > 0,
      },
    })
    .eq("id", syncRunId);

  await triggerLiveSyncIfNeeded(supabase);

    return new Response(JSON.stringify({
      message: `Backup sync (football-data.org): ${matches.length} fetched, ${updated} upserted, ${errors} errors, ${skipped} skipped`,
      provider: "football-data.org",
      fixtures_fetched: matches.length,
      fixtures_updated: updated,
      errors,
      skipped,
      backup_meta: backupMeta,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        last_error: `Backup provider error: ${err.message}`,
        error_count: 1,
        metadata: backupMeta,
      })
      .eq("id", syncRunId);

    return new Response(JSON.stringify({
      error: `Backup provider error: ${err.message}`,
    }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
}

async function triggerLiveSyncIfNeeded(supabase: any) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const next60Iso = new Date(now + 60 * 60 * 1000).toISOString();

  console.log(JSON.stringify({
    step: "triggerLiveSyncIfNeeded:start",
    nowIso,
    next60Iso,
  }));


  const { data: liveOrUpcoming } = await supabase
    .from("wc2026_fixtures")
    .select("id")
    .or(`match_status.eq.live,and(match_status.eq.scheduled,kickoff_utc.gte.${nowIso},kickoff_utc.lte.${next60Iso})`)
    .limit(1);

  console.log(JSON.stringify({
    step: "triggerLiveSyncIfNeeded:result",
    found: (liveOrUpcoming || []).length,
  }));

  if (!liveOrUpcoming || liveOrUpcoming.length === 0) return;

  console.log(JSON.stringify({
    step: "triggerLiveSyncIfNeeded:scheduling-sync-live",
  }));

  const { error } = await supabase.rpc("schedule_sync_live");

  if (error) {
    console.error(JSON.stringify({
      step: "triggerLiveSyncIfNeeded:schedule-sync-live:error",
      error: error.message,
    }));
  }
}

async function recomputeStandings(supabase: any) {
  const { data: fixtures } = await supabase
    .from("wc2026_fixtures")
    .select("home_team_code, away_team_code, home_score, away_score, group_name, match_status")
    .eq("stage", "group")
    .in("match_status", ["completed", "live"]);

  if (!fixtures || fixtures.length === 0) return;

  const standingsMap: Record<string, Record<string, {
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number; points: number;
  }>> = {};

  for (const f of fixtures) {
    if (f.home_score === null || f.away_score === null) continue;
    if (!f.group_name) continue;
    const group = f.group_name;
    if (!standingsMap[group]) standingsMap[group] = {};
    const home = f.home_team_code;
    const away = f.away_team_code;
    if (!standingsMap[group][home]) standingsMap[group][home] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    if (!standingsMap[group][away]) standingsMap[group][away] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    const h = standingsMap[group][home];
    const a = standingsMap[group][away];
    h.played++; a.played++;
    h.goalsFor += f.home_score; h.goalsAgainst += f.away_score;
    a.goalsFor += f.away_score; a.goalsAgainst += f.home_score;
    if (f.home_score > f.away_score) { h.won++; h.points += 3; a.lost++; }
    else if (f.home_score === f.away_score) { h.drawn++; h.points += 1; a.drawn++; a.points += 1; }
    else { a.won++; a.points += 3; h.lost++; }
  }

  await supabase.from("wc2026_standings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const [group, teams] of Object.entries(standingsMap)) {
    const sorted = Object.entries(teams).sort(([, a], [, b]) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
    for (let i = 0; i < sorted.length; i++) {
      const [code, s] = sorted[i];
      await supabase.from("wc2026_standings").insert({
        group_name: group,
        team_code: code,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goals_for: s.goalsFor,
        goals_against: s.goalsAgainst,
        goal_difference: s.goalsFor - s.goalsAgainst,
        points: s.points,
        position: i + 1,
        computed_at: new Date().toISOString(),
      });
    }
  }
}
