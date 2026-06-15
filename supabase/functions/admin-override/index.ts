import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;

    // Manual score override for a specific match
    if (action === "override_score") {
      const { home_team_code, away_team_code, kickoff_utc, home_score, away_score, match_status, status_detail } = body;
      if (!home_team_code || !away_team_code || !kickoff_utc || home_score === undefined || away_score === undefined) {
        return new Response(JSON.stringify({ error: "Missing required fields: home_team_code, away_team_code, kickoff_utc, home_score, away_score" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const status = match_status || "completed";
      let winnerCode: string | null = null;
      if (status === "completed") {
        if (home_score > away_score) winnerCode = home_team_code;
        else if (away_score > home_score) winnerCode = away_team_code;
        else winnerCode = "draw";
      }

      // Find the fixture by teams + kickoff
      const { data: existing, error: findError } = await supabase
        .from("wc2026_fixtures")
        .select("id, provider_fixture_id, home_score, data_source, is_manual_override")
        .eq("home_team_code", home_team_code)
        .eq("away_team_code", away_team_code)
        .eq("kickoff_utc", kickoff_utc)
        .maybeSingle();

      if (findError) {
        return new Response(JSON.stringify({ error: findError.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (existing) {
        // Update existing fixture with manual override
        const { error: updateError } = await supabase
          .from("wc2026_fixtures")
          .update({
            home_score,
            away_score,
            match_status: status,
            status_detail: status_detail || "manual",
            winner_code: winnerCode,
            match_minute: null,
            is_manual_override: true,
            data_source: "manual",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Recompute standings
        await recomputeStandings(supabase);

        return new Response(JSON.stringify({
          message: "Manual override applied",
          fixture_id: existing.id,
          home_score,
          away_score,
          match_status: status,
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      } else {
        // Insert new fixture
        const { error: insertError } = await supabase
          .from("wc2026_fixtures")
          .insert({
            provider_fixture_id: `manual-${Date.now()}`,
            home_team_code,
            away_team_code,
            kickoff_utc,
            home_score,
            away_score,
            match_status: status,
            status_detail: status_detail || "manual",
            winner_code: winnerCode,
            stage: "group",
            is_manual_override: true,
            data_source: "manual",
            last_synced_at: new Date().toISOString(),
          });

        if (insertError) {
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        await recomputeStandings(supabase);

        return new Response(JSON.stringify({
          message: "Manual fixture created with override",
          home_team_code,
          away_team_code,
          home_score,
          away_score,
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Recompute standings from existing data
    if (action === "recompute_standings") {
      await recomputeStandings(supabase);
      return new Response(JSON.stringify({ message: "Standings recomputed" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update provider mode
    if (action === "set_provider_mode") {
      const { mode } = body;
      if (!["primary_only", "fallback_on_failure", "backup_only"].includes(mode)) {
        return new Response(JSON.stringify({ error: "Invalid mode. Use: primary_only, fallback_on_failure, backup_only" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const { error } = await supabase
        .from("provider_config")
        .update({ provider_mode: mode, updated_at: new Date().toISOString() })
        .eq("is_active", true);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ message: `Provider mode set to ${mode}` }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Run backup sync only
    if (action === "backup_sync") {
      const backupKey = Deno.env.get("FOOTBALL_DATA_ORG_KEY");
      if (!backupKey) {
        return new Response(JSON.stringify({ error: "FOOTBALL_DATA_ORG_KEY not configured" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      // Delegate to sync-fixtures with backup mode flag
      const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-fixtures`;
      const resp = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ force_backup: true }),
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: override_score, recompute_standings, set_provider_mode, backup_sync" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
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
