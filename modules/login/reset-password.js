/** Standalone recovery flow. The official Supabase Auth SDK consumes the one-use recovery link. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('recovery-form'), status = $('recovery-status'), submit = $('recovery-submit');
  const password = $('recovery-password'), confirmation = $('recovery-confirm');
  const config = window.TAXIQAID_DEDICATED_AUTH;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isRecoveryLink = hash.get('type') === 'recovery' && hash.has('access_token') && hash.has('refresh_token');
  let recoveryReady = false, busy = false, completed = false;
  function message(text, state = '') { status.textContent = text; status.dataset.state = state; }
  function rejectLink() {
    recoveryReady = false;
    form.hidden = true;
    password.value = confirmation.value = '';
    message('This recovery link is missing, expired or invalid. Ask your administrator for a new reset email.', 'error');
  }
  if (config?.enabled !== true ||
      config.url !== 'https://mqkflwsvnzcaylxtvsje.supabase.co' ||
      typeof config.publicKey !== 'string' ||
      typeof window.supabase?.createClient !== 'function') {
    message('Password recovery is currently unavailable.', 'error');
    return;
  }
  if (!isRecoveryLink) { rejectLink(); return; }
  const client = window.supabase.createClient(config.url, config.publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storageKey: 'taxiqaid-password-recovery-only'
    }
  });
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (event !== 'PASSWORD_RECOVERY' || !isRecoveryLink || !session?.user?.id) return;
    // Auth callbacks must not await other SDK Auth methods within the callback itself.
    setTimeout(async () => {
      try {
        const { data, error } = await client.auth.getUser();
        if (error || !data.user || data.user.id !== session.user.id) { rejectLink(); return; }
        // Remove tokens from the browser URL only after the SDK has processed them.
        history.replaceState(null, '', window.location.pathname);
        recoveryReady = true;
        form.hidden = false;
        message('Your link is verified. Choose a new password.');
        password.focus();
      } catch { rejectLink(); }
    }, 0);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!recoveryReady || busy) return;
    const value = password.value;
    if (value.length < 6 || value.length > 256 || value !== confirmation.value) {
      message('Passwords must match and have at least 6 characters.', 'error');
      return;
    }
    busy = true;
    submit.disabled = true;
    message('Updating your password...');
    try {
      const { error } = await client.auth.updateUser({ password: value });
      if (error) { message('Password not accepted. Choose a stronger password and try again.', 'error'); return; }
      completed = true;
      recoveryReady = false;
      form.hidden = true;
      message('Password changed. Return to TaxiQaid and sign in with your usual username.', 'success');
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      subscription.unsubscribe();
    } catch {
      message('Password update could not be confirmed. Try again or request a new reset email.', 'error');
    } finally {
      password.value = confirmation.value = '';
      busy = false;
      submit.disabled = !recoveryReady;
    }
  });
  // Supabase may report invalid token redirects without a valid PASSWORD_RECOVERY event.
  window.setTimeout(() => { if (!recoveryReady && !busy && !completed) rejectLink(); }, 12000);
})();
