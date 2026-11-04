/**
 * TAXI QAID ERP | write-guard.js
 *
 * Client-side safeguard: verify the current Supabase user and a matching
 * authorized role before submitting any change to Google Apps Script.
 *
 * CRITICAL: This is not server-side authorization. A visitor can bypass
 * browser JavaScript and send requests straight to a published Apps Script URL.
 * Every Apps Script doPost() handler must independently verify authorization.
 * See docs/SECURITY.md before publishing a production deployment.
 */

async function requireAuthorizedUser() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData || !userData.user) {
    throw new Error("Sign in again before updating records.");
  }

  const { data: roleData, error: roleError } = await supabaseClient
    .from("taxiqaid_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError || !roleData || !roleData.role) {
    throw new Error("You are not authorized to update records.");
  }
  return userData.user;
}

async function postAuthorizedSheetUpdate(url, payload) {
  await requireAuthorizedUser();
  // Preserve the original text/plain request format expected by Apps Script.
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });
}
