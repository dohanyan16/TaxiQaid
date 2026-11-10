/**
 * TaxiQaid | config.js
 * Purpose: Public configuration: Supabase authentication and disconnected legacy configuration.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    const SUPABASE_URL = window.TAXIQAID_DEDICATED_AUTH?.url || "https://gycijhgmmaznvcoxphlh.supabase.co";
    const SUPABASE_PUBLIC_KEY = window.TAXIQAID_DEDICATED_AUTH?.publicKey || "sb_publishable_HzPfzuV-3Z-6aCuvGWcBHQ_R5gF7F7T";
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, window.TAXIQAID_DEDICATED_AUTH ? {auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'taxiqaid-dedicated-auth'}} : undefined);

    // Legacy data endpoints are intentionally disconnected.
    const GOOGLE_SHEET_DRIVERS_URL = "";
    const GOOGLE_SHEET_FLEET_URL = "";
    const GOOGLE_SHEET_ACCIDENTS_URL = "";
    const GOOGLE_SHEET_TRIPCHECK_URL = "";
