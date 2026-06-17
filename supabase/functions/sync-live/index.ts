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

const MATCH_DURATION_MS = 3 * 60 * 60 * 1000;
const PRE_MATCH_WINDOW_MS = 60 * 60 * 1000;
const NON_MATCH_INTERVAL_MS = 30 * 60 * 1000;
const IN_WINDOW_DOUBLE_FETCH_GAP_MS = 30 * 1000;

function resolveTeamCode(name: string): string | null {
  return TEAM_MAP[name] || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const backupKey = Deno.env.get("FOOTBALL_DATA_ORG_KEY");
  if (!backupKey) {
    return new Response(JSON.stringify({ error: "FOOTBALL_DATA_ORG_KEY not configured." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const now = Date.now();

  const { data: candidates } = await supabase
    .from("wc2026_fixtures")
    .select("kickoff_utc, match_status")
    .neq("match_status", "completed")
    .gte("kickoff_utc", new Date(now - MATCH_DURATION_MS).toISOString())
    .lte("kickoff_utc", new Date(now + PRE_MATCH_WINDOW_MS).toISOString());

  const inMatchWindow = (candidates || []).some((f: any) => {
    const kickoff = new Date(f.kickoff_utc).getTime();
    return now >= kickoff - PRE_MATCH_WINDOW_MS && now <= kickoff + MATCH_DURATION_MS;
  });

  if (!inMatchWindow) {
    const { data: lastRun } = await supabase
      .from("sync_runs")
      .select("started_at")
      .eq("sync_type", "live")
      .in("status", ["success", "error"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun && now - new Date(lastRun.started_at).getTime() < NON_MATCH_INTERVAL_MS) {
      return new Response(JSON.stringify({
        message: "Outside match window; throttled to 30-minute interval.",
        status: "skipped", in_match_window: false,
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
  }

  const { data: runningSyncs } = await supabase
    .from("sync_runs").select("id").eq("sync_type", "live").eq("status", "running")
    .gt("started_at", new Date(now - 2 * 60 * 1000).toISOString()).limit(1);

  if (runningSyncs && runningSyncs.length > 0) {
    return new Response(JSON.stringify({ message: "Live sync already running.", status: "skipped" }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  const results: any[] = [];
  results.push(await runSync(supabase, backupKey, inMatchWindow));

  if (inMatchWindow) {
    await new Promise(r => setTimeout(r, IN_WINDOW_DOUBLE_FETCH_GAP_MS));
    results.push(await runSync(supabase, backupKey, inMatchWindow));
  }

  return new Response(JSON.stringify({ in_match_window: inMatchWindow, runs: results }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } });
});

async function runSync(supabase: any, backupKey: string, inMatchWindow: boolean) {
  const { data: syncRun } = await supabase
    .from("sync_runs")
    .insert({ sync_type: "live", provider_name: "football-data.org", status: "running" })
    .select("id").single();

  const syncRunId = syncRun?.id;
  const meta: Record<string, any> = { provider: "football-data.org", in_match_window: inMatchWindow };

  try {
    const url = "https://api.football-data.org/v4/competitions/WC/matches?season=2026";
    let resp: Response;
    try {
      resp = await fetch(url, { headers: { "X-Auth-Token": backupKey } });
    } catch (fetchErr: any) {
      meta.first_attempt_error = fetchErr?.message || String(fetchErr);
      await new Promise(r => setTimeout(r, 1000));
      resp = await fetch(url, { headers: { "X-Auth-Token": backupKey } });
    }

    meta.http_status = resp.status;
    meta.request_url = url;

    if (!resp.ok) {
      const errBody = await resp.text();
      meta.error_body = errBody.slice(0, 500);
      await supabase.from("sync_runs").update({
        status: "error", finished_at: new Date().toISOString(),
        last_error: `HTTP ${resp.status}`, error_count: 1, metadata: meta,
      }).eq("id", syncRunId);
      return { status: "error", http_status: resp.status };
    }

    const data = await resp.json();
    const matches = data.matches || [];
    meta.matches_count = matches.length;

    let updated = 0, errors = 0, skipped = 0;
    let unmappedTeams: string[] = [];
    let insertErrorSamples: string[] = [];

    for (const match of matches) {
      try {
        const homeName = match.homeTeam?.name || match.homeTeam?.shortName;
        const awayName = match.awayTeam?.name || match.awayTeam?.shortName;
        const homeCode = resolveTeamCode(homeName);
        const awayCode = resolveTeamCode(awayName);

        if (!homeCode || !awayCode) {
          if (!homeCode && homeName) unmappedTeams.push(homeName);
          if (!awayCode && awayName) unmappedTeams.push(awayName);
          skipped++; continue;
        }

        const kickoff = match.utcDate;
        const status = match.status;
        let matchStatus = "scheduled";
        if (status === "FINISHED") matchStatus = "completed";
        else if (status === "IN_PLAY" || status === "PAUSED") matchStatus = "live";
        else if (status === "POSTPONED" || status === "CANCELLED") matchStatus = "postponed";

        const homeScore = match.score?.fullTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? null;

        let winnerCode: string | null = null;
        if (matchStatus === "completed" && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winnerCode = homeCode;
          else if (awayScore > homeScore) winnerCode = awayCode;
          else winnerCode = "draw";
        }

        const group = match.group;
        let stage = "group";
        let groupName: string | null = null;
        if (group) {
          groupName = group.replace(/[^A-L]/g, "").slice(-1) || null;
          stage = "group";
        } else {
          const stageStr = (match.stage || "").toLowerCase();
          if (stageStr.includes("last_32") || stageStr.includes("round_of_32")) stage = "r32";
          else if (stageStr.includes("last_16") || stageStr.includes("round_of_16")) stage = "r16";
          else if (stageStr.includes("quarter")) stage = "qf";
          else if (stageStr.includes("semi")) stage = "sf";
          else if (stageStr.includes("third")) stage = "third";
          else if (stageStr.includes("final")) stage = "final";
        }

        const providerFixtureId = `fd-${match.id}`;

        const { data: existing } = await supabase
          .from("wc2026_fixtures")
          .select("home_score, away_score, match_status")
          .eq("home_team_code", homeCode).eq("away_team_code", awayCode)
          .eq("kickoff_utc", kickoff).limit(1).maybeSingle();

        if (existing && homeScore === null && existing.home_score !== null) { skipped++; continue; }

        const row: Record<string, any> = {
          provider_fixture_id: providerFixtureId, stage, group_name: groupName,
          matchday: match.matchday || null, kickoff_utc: kickoff,
          home_team_code: homeCode, away_team_code: awayCode,
          home_score: homeScore, away_score: awayScore,
          match_status: matchStatus, status_detail: status,
          match_minute: null, winner_code: winnerCode,
          last_synced_at: new Date().toISOString(), data_source: "football-data.org",
        };

        if (existing) {
          const { error: updateError } = await supabase.from("wc2026_fixtures")
            .update(row).eq("home_team_code", homeCode)
            .eq("away_team_code", awayCode).eq("kickoff_utc", kickoff);
          if (updateError) { errors++; insertErrorSamples.push(updateError.message); }
          else updated++;
        } else {
          const { error: insertError } = await supabase.from("wc2026_fixtures")
            .insert({ ...row, venue: null, city: null });
          if (insertError) { errors++; insertErrorSamples.push(insertError.message); }
          else updated++;
        }
      } catch (e: any) { errors++; insertErrorSamples.push(e?.message || String(e)); }
    }

    if (updated > 0) await recomputeStandings(supabase);

    meta.updated = updated; meta.skipped = skipped; meta.errors = errors;
    meta.unmappedTeams = [...new Set(unmappedTeams)];
    meta.insertErrorSamples = insertErrorSamples.slice(0, 5);

    await supabase.from("sync_runs").update({
      status: errors === 0 ? "success" : (updated > 0 ? "success" : "error"),
      finished_at: new Date().toISOString(),
      fixtures_fetched: matches.length, fixtures_updated: updated,
      error_count: errors, metadata: meta,
    }).eq("id", syncRunId);

    return { status: "success", updated, errors, skipped };
  } catch (err: any) {
    await supabase.from("sync_runs").update({
      status: "error", finished_at: new Date().toISOString(),
      last_error: `Live sync error: ${err.message}`, error_count: 1, metadata: meta,
    }).eq("id", syncRunId);
    return { status: "error", error: err.message };
  }
}

async function recomputeStandings(supabase: any) {
  const { data: fixtures } = await supabase.from("wc2026_fixtures")
    .select("home_team_code, away_team_code, home_score, away_score, group_name, match_status")
    .eq("stage", "group").in("match_status", ["completed", "live"]);

  if (!fixtures || fixtures.length === 0) return;

  const standingsMap: Record<string, Record<string, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>> = {};

  for (const f of fixtures) {
    if (f.home_score === null || f.away_score === null || !f.group_name) continue;
    const g = f.group_name;
    if (!standingsMap[g]) standingsMap[g] = {};
    const home = f.home_team_code, away = f.away_team_code;
    if (!standingsMap[g][home]) standingsMap[g][home] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    if (!standingsMap[g][away]) standingsMap[g][away] = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    const h = standingsMap[g][home], a = standingsMap[g][away];
    h.played++; a.played++;
    h.goalsFor += f.home_score; h.goalsAgainst += f.away_score;
    a.goalsFor += f.away_score; a.goalsAgainst += f.home_score;
    if (f.home_score > f.away_score) { h.won++; h.points += 3; a.lost++; }
    else if (f.home_score === f.away_score) { h.drawn++; h.points++; a.drawn++; a.points++; }
    else { a.won++; a.points += 3; h.lost++; }
  }

  await supabase.from("wc2026_standings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const [group, teams] of Object.entries(standingsMap)) {
    const sorted = Object.entries(teams).sort(([, a], [, b]) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdDiff = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
      if (gdDiff !== 0) return gdDiff;
      return b.goalsFor - a.goalsFor;
    });
    for (let i = 0; i < sorted.length; i++) {
      const [code, s] = sorted[i];
      await supabase.from("wc2026_standings").insert({
        group_name: group, team_code: code, played: s.played,
        won: s.won, drawn: s.drawn, lost: s.lost,
        goals_for: s.goalsFor, goals_against: s.goalsAgainst,
        goal_difference: s.goalsFor - s.goalsAgainst,
        points: s.points, position: i + 1, computed_at: new Date().toISOString(),
      });
    }
  }
}
