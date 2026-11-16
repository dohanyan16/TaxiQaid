// Offline self-service password recovery at the dedicated login, with a mocked Auth sender.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('modules/login/request-password-reset.js', 'utf8');

function fixture(enabled = true, sender = async () => ({ error: null })) {
  const ids = ['password-reset-entry','login-form','driver-signin-entry',
    'password-reset-panel','password-reset-request-form','password-reset-email',
    'password-reset-submit','password-reset-status','password-reset-back','username'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    hidden: ['password-reset-entry','password-reset-panel','password-reset-status'].includes(id),
    value: '', textContent: '', disabled: false, dataset: {}, handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    checkValidity() { return true; }, reset() { this.wasReset = true; },
    focus() { this.wasFocused = true; }
  }]));
  let created = 0;
  const calls = [];
  const window = { TAXIQAID_DEDICATED_AUTH: {
    enabled, url: 'https://mqkflwsvnzcaylxtvsje.supabase.co', publicKey: 'public-fixture'
  }, supabase: { createClient(url, key, options) {
    created++;
    assert.equal(url, 'https://mqkflwsvnzcaylxtvsje.supabase.co');
    assert.equal(key, 'public-fixture');
    assert.equal(options.auth.persistSession, false);
    assert.equal(options.auth.autoRefreshToken, false);
    assert.equal(options.auth.detectSessionInUrl, false);
    return { auth: { resetPasswordForEmail: async (email, options) => {
      calls.push({email, options});
      return sender(email, options);
    } } };
  } } };
  vm.runInNewContext(source, {window, document: { getElementById: id => elements[id] }});
  return { elements, calls, created };
}
test('employee request uses only entered registration email and official callback', async () => {
  const f = fixture(), e = f.elements;
  assert.equal(f.created, 1);
  assert.equal(e['password-reset-entry'].hidden, false);
  e['password-reset-entry'].handlers.click();
  assert.equal(e['login-form'].hidden, true);
  assert.equal(e['driver-signin-entry'].hidden, true);
  assert.equal(e['password-reset-panel'].hidden, false);
  e['password-reset-email'].value = '  Worker@Example.Com  ';
  await e['password-reset-request-form'].handlers.submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].email, 'worker@example.com');
  assert.equal(f.calls[0].options.redirectTo, 'https://dohanyan16.github.io/TaxiQaid/reset-password.html');
  assert.match(e['password-reset-status'].textContent, /If an account uses this email/);
  assert.equal(e['password-reset-submit'].disabled, true);
  await e['password-reset-request-form'].handlers.submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1, 'duplicate sends must be blocked in this page session');
  e['password-reset-back'].handlers.click();
  assert.equal(e['login-form'].hidden, false);
  assert.equal(e['driver-signin-entry'].hidden, false);
});
test('sender error never claims delivery and permits retry', async () => {
  const f = fixture(true, async () => ({error: {message: 'SMTP failure'}}));
  f.elements['password-reset-email'].value = 'employee@example.com';
  await f.elements['password-reset-request-form'].handlers.submit({ preventDefault() {} });
  assert.match(f.elements['password-reset-status'].textContent, /temporarily unavailable/);
  assert.equal(f.elements['password-reset-submit'].disabled, false);
  assert.equal(f.calls.length, 1);
});
test('legacy or invalid dedicated configuration does not offer reset or use email Auth', () => {
  const f = fixture(false);
  assert.equal(f.created, 0);
  assert.equal(f.elements['password-reset-entry'].hidden, true);
});
test('login screen exposes a dedicated email reset form without entering a password or leaking secrets', () => {
  const markup = fs.readFileSync('modules/login/login.html', 'utf8');
  const boot = fs.readFileSync('shared/bootstrap.js', 'utf8');
  assert.match(markup, /id="password-reset-entry"/);
  assert.match(markup, /id="password-reset-email" type="email"/);
  assert.ok(boot.includes('"modules/login/request-password-reset.js"'));
  assert.ok(boot.indexOf('modules/login/login-dedicated.js') < boot.indexOf('modules/login/request-password-reset.js'));
  assert.doesNotMatch(source, /service_role|TAXIQAID_AUTH_ADMIN_KEY|localStorage|indexedDB|signInWithPassword|updateUser/);
  new Function(source);
});
