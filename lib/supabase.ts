import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are not set. Using localStorage fallback.");
}

// Create Supabase client for server-side usage
export function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Create Supabase client for client-side usage
export function createClientSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("createClientSupabaseClient can only be used on the client side");
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

