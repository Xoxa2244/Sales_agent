import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

const CONFIG_ID = "main"; // Single config record ID

// GET: Load configuration
export async function GET() {
  try {
    // Try Supabase first
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("agent_config")
        .select("config")
        .eq("id", CONFIG_ID)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is OK for first time
        throw error;
      }

      if (data?.config) {
        return NextResponse.json(data.config);
      }
    } catch (supabaseError: any) {
      // If Supabase is not configured or fails, return empty config
      if (supabaseError.message?.includes("environment variables")) {
        console.warn("Supabase not configured, returning empty config");
      } else {
        console.error("Supabase error:", supabaseError);
      }
    }

    // Return empty config if Supabase fails or not configured
    return NextResponse.json({
      guardrails: "",
      agents: {},
    });
  } catch (error) {
    console.error("Error loading config:", error);
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

// POST: Save configuration
export async function POST(req: NextRequest) {
  try {
    const config = await req.json();

    // Try Supabase first
    try {
      const supabase = createServerSupabaseClient();
      
      // Upsert (insert or update) the config
      const { error } = await supabase
        .from("agent_config")
        .upsert({
          id: CONFIG_ID,
          config: config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        });

      if (error) {
        throw error;
      }

      return NextResponse.json({ success: true });
    } catch (supabaseError: any) {
      // If Supabase is not configured, return error
      if (supabaseError.message?.includes("environment variables")) {
        return NextResponse.json(
          { 
            error: "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
            fallback: true 
          },
          { status: 500 }
        );
      }
      throw supabaseError;
    }
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
