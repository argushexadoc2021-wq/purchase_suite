import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://gvyptnnwjudahvvnkynh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5gRa-Hm1ZpeM3s1NlfwzLw_AkQ6wS7o";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
