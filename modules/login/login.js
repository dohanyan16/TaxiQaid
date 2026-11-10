/**
 * TaxiQaid | auth.js
 * Purpose: Supabase login, access-role lookup, and logout.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    const loginScreen = document.getElementById("login-screen");
    const erpApp = document.getElementById("erp-app");
    const loginForm = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const loginButton = document.getElementById("login-button");
    const logoutButton = document.getElementById("logout-button");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");

    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const collapsed = sidebar.classList.contains("collapsed");
      sidebarToggle.textContent = collapsed ? "›" : "‹";
      sidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    });

    loginForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      errorMessage.hidden = true;
      loginButton.disabled = true;
      loginButton.textContent = "Signing in...";

      try {
        const usernameVal = usernameInput.value.trim().toLowerCase();
        loggedInUserName = usernameVal;
        const email = usernameVal + "@taxiqaiddemand.com";
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: passwordInput.value });
        if (authError) throw authError;

        const { data: profile, error: profileError } = await supabaseClient
          .from("taxiqaid_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
        if (profileError || !profile || TaxiQaidAccess.legacyRoleIsDriver(profile.role)) {
          await supabaseClient.auth.signOut();
          throw new Error("No authorized role found.");
        }

        document.dispatchEvent(new CustomEvent("taxiqaid:management-session", {detail:{uid:authData.user.id,legacyRole:profile.role}}));
        loginScreen.style.display = "none";
        erpApp.style.display = "flex";
      } catch (error) {
        errorMessage.textContent = "Unable to sign in. Check your credentials.";
        errorMessage.hidden = false;
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
      }
    });

    logoutButton.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      TaxiQaidAccess.reset();
      erpApp.style.display = "none";
      loginScreen.style.display = "flex";
      loginForm.reset();
    });

// Auth identity changes clear private portal snapshots; existing management login remains intact.
supabaseClient.auth.onAuthStateChange((event, session) => {
  TaxiQaidAccess.observeIdentity(event, session);
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' && !TaxiQaidAccess.hasLegacyManagementSession()) {
    erpApp.style.display = 'none'; loginScreen.style.display = 'flex';
    if (event === 'SIGNED_OUT') loginForm.reset();
  }
});
