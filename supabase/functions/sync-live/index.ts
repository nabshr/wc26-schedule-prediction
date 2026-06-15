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

function mapStatus(shortStatus: string): string {
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
      error: "API_FOOTBALL_KEY not configured.",
    }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Check if any matches are currently live in our DB
  const { data: liveFixtures } = await supabase
    .from("wc2026_fixtures")
    .select("provider_fixture_id")
    .eq("match_status", "live");

  const liveProviderIds = (liveFixtures || []).map((f: any) => f.provider_fixture_id).filter(Boolean);

  // If no live matches and no recently-completed matches to confirm, do a lightweight check
  // by fetching just live fixtures from the API
  const { data: config } = await supabase
    .from("provider_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  const competitionId = config?.competition_id || 1;
  const season = config?.season || 2026;
  const baseUrl = config?.base_url || "https://v3.football.api-sports.io";

  // Create sync run
  const { data: syncRun } = await supabase
    .from("sync_runs")
    .insert({ sync_type: "live", provider_name: "api-football", status: "running", is_live_match: liveProviderIds.length > 0 })
    .select("id")
    .single();

  const syncRunId = syncRun?.id;

  try {
    // Fetch only live fixtures from API-Football (much lighter than full fixture list)
    const url = `${baseUrl}/fixtures?league=${competitionId}&season=${season}&live=all`;
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`API-Football HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const apiFixtures = data.response || [];

    let updated = 0;
    let errors = 0;
    let liveCount = 0;

    // Process live fixtures from API
    for (const fixture of apiFixtures) {
      try {
        const homeName = fixture.teams?.home?.name;
        const awayName = fixture.teams?.away?.name;
        const homeCode = resolveTeamCode(homeName);
        const awayCode = resolveTeamCode(awayName);

        if (!homeCode || !awayCode) { errors++; continue; }

        const providerFixtureId = fixture.fixture?.id;
        const shortStatus = fixture.fixture?.status?.short || "NS";
        const matchStatus = mapStatus(shortStatus);
        const matchMinute = fixture.fixture?.status?.elapsed || null;
        const homeScore = fixture.goals?.home ?? null;
        const awayScore = fixture.goals?.away ?? null;

        let winnerCode: string | null = null;
        if (matchStatus === "completed" && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) winnerCode = homeCode;
          else if (awayScore > homeScore) winnerCode = awayCode;
          else winnerCode = "draw";
        }

        if (matchStatus === "live") liveCount++;

        const row = {
          home_score: homeScore,
          away_score: awayScore,
          match_status: matchStatus,
          status_detail: shortStatus,
          match_minute: matchMinute,
          winner_code: winnerCode,
          last_synced_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("wc2026_fixtures")
          .update(row)
          .eq("provider_fixture_id", providerFixtureId);

        if (updateError) errors++;
        else updated++;
      } catch {
        errors++;
      }
    }

    // Check previously-live fixtures that might have finished since last poll
    for (const providerId of liveProviderIds) {
      // If this fixture wasn't in the live API response, it might have just finished
      const wasInApiResponse = apiFixtures.some((f: any) => f.fixture?.id === providerId);
      if (!wasInApiResponse) {
        // Fetch this specific fixture to get final result
        const checkUrl = `${baseUrl}/fixtures?id=${providerId}`;
        try {
          const checkResp = await fetch(checkUrl, { headers: { "x-apisports-key": apiKey } });
          if (checkResp.ok) {
            const checkData = await checkResp.json();
            const fixture = checkData.response?.[0];
            if (fixture) {
              const shortStatus = fixture.fixture?.status?.short || "";
              const matchStatus = mapStatus(shortStatus);
              if (matchStatus === "completed") {
                const homeScore = fixture.goals?.home ?? null;
                const awayScore = fixture.goals?.away ?? null;
                const homeCode = resolveTeamCode(fixture.teams?.home?.name);
                const awayCode = resolveTeamCode(fixture.teams?.away?.name);

                let winnerCode: string | null = null;
                if (homeScore !== null && awayScore !== null) {
                  if (homeScore > awayScore) winnerCode = homeCode;
                  else if (awayScore > homeScore) winnerCode = awayCode;
                  else winnerCode = "draw";
                }

                await supabase
                  .from("wc2026_fixtures")
                  .update({
                    home_score: homeScore,
                    away_score: awayScore,
                    match_status: "completed",
                    status_detail: shortStatus,
                    match_minute: null,
                    winner_code: winnerCode,
                    last_synced_at: new Date().toISOString(),
                  })
                  .eq("provider_fixture_id", providerId);
                updated++;
              }
            }
          }
        } catch {
          // Non-critical: will be caught on next poll
        }
      }
    }

    // Recompute standings if any match was completed
    const hadCompleted = apiFixtures.some((f: any) => mapStatus(f.fixture?.status?.short) === "completed");
    if (hadCompleted || liveProviderIds.length > 0) {
      await recomputeStandings(supabase);
    }

    await supabase
      .from("sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        fixtures_fetched: apiFixtures.length,
        fixtures_updated: updated,
        error_count: errors,
        is_live_match: liveCount > 0,
      })
      .eq("id", syncRunId);

    return new Response(JSON.stringify({
      message: `Live sync: ${apiFixtures.length} live fixtures, ${updated} updated, ${liveCount} currently live`,
      live_count: liveCount,
      updated,
      errors,
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
