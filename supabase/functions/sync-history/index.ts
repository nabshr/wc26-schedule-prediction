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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const tables = ["tournaments", "teams", "matches", "stages", "group_standings", "tournament_teams"] as const;
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      counts[table] = count || 0;
    }

    const tournamentList = await supabase
      .from("tournaments")
      .select("year")
      .order("year", { ascending: true });
    const years = (tournamentList.data || []).map((t: any) => t.year);

    return new Response(JSON.stringify({
      message: `Database contains ${counts.tournaments} tournaments (${years.length > 0 ? years[0] + '-' + years[years.length - 1] : 'none'}), ${counts.matches} matches, ${counts.teams} teams, ${counts.group_standings} group standings records. Data was imported from openfootball/worldcup.`,
      counts,
      years,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
