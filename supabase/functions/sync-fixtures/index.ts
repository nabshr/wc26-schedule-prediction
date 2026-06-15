import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Canonical team code mapping: API-Football team name -> our 3-letter code
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

// Map API-Football stage/round names to our internal stage codes
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

// Map API-Football short status to our internal match_status
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "API_FOOTBALL_KEY not configured. Set this as a Supabase edge function secret.",
    }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Concurrency guard: check if a sync is already running
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

  // Create sync run record
  const { data: syncRun } = await supabase
    .from("sync_runs")
    .insert({ sync_type: "fixtures", provider_name: "api-football", status: "running" })
    .select("id")
    .single();

  const syncRunId = syncRun?.id;

  try {
    // Get provider config
    const { data: config } = await supabase
      .from("provider_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    const competitionId = config?.competition_id || 1;
    const season = config?.season || 2026;
    const baseUrl = config?.base_url || "https://v3.football.api-sports.io";

    // Fetch fixtures from API-Football
    const url = `${baseUrl}/fixtures?league=${competitionId}&season=${season}`;
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`API-Football HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const apiFixtures = data.response || [];

    let inserted = 0;
    let updated = 0;
    let errors = 0;
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
          errors++;
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
        };

        // Upsert by provider_fixture_id
        const { error: upsertError } = await supabase
          .from("wc2026_fixtures")
          .upsert(row, {
            onConflict: "provider_fixture_id",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          // Check if it was an insert vs update
          errors++;
        } else {
          // Count as update if fixture already existed
          const { count } = await supabase
            .from("wc2026_fixtures")
            .select("*", { count: "exact", head: true })
            .eq("provider_fixture_id", providerFixtureId);
          updated++;
        }
      } catch (e: any) {
        errors++;
      }
    }

    // Recompute group standings from synced fixtures
    await recomputeStandings(supabase);

    // Update sync run
    await supabase
      .from("sync_runs")
      .update({
        status: errors > 0 && apiFixtures.length === 0 ? "error" : "success",
        finished_at: new Date().toISOString(),
        fixtures_fetched: apiFixtures.length,
        fixtures_inserted: inserted,
        fixtures_updated: updated,
        error_count: errors,
        is_live_match: hasLiveMatch,
        metadata: { unmappedTeams: [...new Set(unmappedTeams)] },
      })
      .eq("id", syncRunId);

    return new Response(JSON.stringify({
      message: `Sync completed: ${apiFixtures.length} fixtures fetched, ${updated} upserted, ${errors} errors`,
      fixtures_fetched: apiFixtures.length,
      fixtures_updated: updated,
      errors,
      hasLiveMatch,
      unmappedTeams: [...new Set(unmappedTeams)],
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

    return new Response(JSON.stringify({
      error: err.message,
    }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

// Recompute group standings from synced fixtures
async function recomputeStandings(supabase: any) {
  const { data: fixtures } = await supabase
    .from("wc2026_fixtures")
    .select("home_team_code, away_team_code, home_score, away_score, group_name, match_status")
    .eq("stage", "group")
    .in("match_status", ["completed", "live"]);

  if (!fixtures || fixtures.length === 0) return;

  // Build standings per group
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

  // Clear existing standings and rewrite
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
