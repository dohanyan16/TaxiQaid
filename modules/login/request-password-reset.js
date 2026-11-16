/** Self-service password recovery on the dedicated management login. No credential changes here. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.TAXIQAID_DEDICATED_AUTH;
  const entry = $('password-reset-entry');
  if (config?.enabled !== true ||
      config.url !== 'https://mqkflwsvnzcaylxtvsje.supabase.co' ||
      typeof config.publicKey !== 'string' || !config.publicKey ||
      typeof window.supabase?.createClient !== 'function') return;
  const callback = 'https://dohanyan16.github.io/TaxiQaid/reset-password.html';
  const login = $('login-form'), driver = $('driver-signin-entry');
  const panel = $('password-reset-panel'), form = $('password-reset-request-form');
  const email = $('password-reset-email'), submit = $('password-reset-submit');
  const status = $('password-reset-status'), back = $('password-reset-back');
  let busy = false, requested = false;
  const client = window.supabase.createClient(config.url, config.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
      storageKey: 'taxiqaid-reset-request-only' }
  });
  function message(value, state) {
    status.textContent = value;
    status.dataset.state = state;
    status.hidden = false;
  }
  entry.hidden = false;
  entry.addEventListener('click', () => {
    login.hidden = true;
    driver.hidden = true;
    entry.hidden = true;
    panel.hidden = false;
    email.focus();
  });
  back.addEventListener('click', () => {
    if (busy) return;
    panel.hidden = true;
    login.hidden = false;
    driver.hidden = false;
    entry.hidden = false;
    form.reset();
    status.hidden = true;
    status.textContent = '';
    $('username').focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || requested || !form.checkValidity()) return;
    const address = email.value.trim().toLowerCase();
    busy = true;
    submit.disabled = true;
    message('Requesting your password reset email...', '');
    try {
      const { error } = await client.auth.resetPasswordForEmail(address, { redirectTo: callback });
      if (error) {
        message('Password reset is temporarily unavailable. Please try again later or contact your administrator.', 'error');
        return;
      }
      requested = true;
      // A successful request must not disclose whether the address belongs to any account.
      message('If an account uses this email, a password reset link will be sent. Check your inbox and spam folder.', 'success');
    } catch {
      message('Password reset is temporarily unavailable. Please try again later or contact your administrator.', 'error');
    } finally {
      busy = false;
      submit.disabled = requested;
      email.value = '';
    }
  });
})();
