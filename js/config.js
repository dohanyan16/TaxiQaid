/**
 * TAXI QAID ERP | config.js
 * Purpose: Public configuration: Supabase client and Apps Script endpoints.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    const SUPABASE_URL = "https://gycijhgmmaznvcoxphlh.supabase.co";
    const SUPABASE_PUBLIC_KEY = "sb_publishable_HzPfzuV-3Z-6aCuvGWcBHQ_R5gF7F7T";
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

    const GOOGLE_SHEET_DRIVERS_URL = "https://script.google.com/macros/s/AKfycby7-NkH3HuZF2dXsLf0WGCV76bdxSZ1YXZsbs785qrgIAoBA9eal7DIRYPWypwWRPpQkA/exec";
    const GOOGLE_SHEET_FLEET_URL = "https://script.google.com/macros/s/AKfycbyaQI9cnIy7qEYt8F0BNSG2y1HOPD-8kjKU12Y9LbDNq4aLaJ3wrVEbYp2e6Mzmnfsr/exec";
    const GOOGLE_SHEET_ACCIDENTS_URL = "https://script.google.com/macros/s/AKfycbw7pMHgStWn01h_us5DdwndS20sWq9_Ox6uI-dQM1FsC_o8aHj0et96qwZxqD-lsPIs-Q/exec";
    // TODO: Replace this URL with the deployed Trip Check Apps Script endpoint ending in /exec.
    const GOOGLE_SHEET_TRIPCHECK_URL = "https://script.google.com/macros/s/PEGA_AQUI_TU_ID_DE_DESPLIEGUE/exec";
