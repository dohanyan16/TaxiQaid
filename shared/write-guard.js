/** TaxiQaid: legacy transport is disabled; existing authorization is preserved. */

async function requireAuthorizedUser() {
  if(window.TAXIQAID_DEDICATED_AUTH){
    const context=await TaxiQaidDedicatedLogin.auth.refresh();
    return {id:context.uid,fullName:context.fullName};
  }
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
  throw new Error("Database integration pending");
}
