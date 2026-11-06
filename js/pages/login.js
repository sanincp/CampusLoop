(async function () {
  const { $, $$, icon, toast, errMsg, setLoading } = CL;

  // static decoration
  $('#logo').innerHTML = CL.brandLogo('text-2xl');
  $('#logo-m').innerHTML = CL.brandLogo('text-2xl');
  $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 'w-4 h-4'); el.classList.add('inline-flex'); });
  $('#perks').innerHTML = [['users', 'Student Community'], ['leaf', 'Sustainable Campus'], ['shield', 'Safe & Trusted']]
    .map(([ic, t]) => `<div class="flex flex-col items-start gap-2">${icon(ic, 'w-6 h-6 text-brand-600')}<span>${t}</span></div>`).join('');

  // keep ?next= when moving between login and signup
  const next = location.search.includes('next=') ? location.search : '';
  $('#to-signup').href = 'signup.html' + next;

  const msg = $('#msg');
  function show(text, ok) {
    msg.textContent = text;
    msg.className = 'text-sm rounded-lg px-3 py-2 ' + (ok ? 'bg-leaf-50 text-leaf-700' : 'bg-red-50 text-red-700');
  }

  $('#toggle-pw').addEventListener('click', () => {
    const pw = $('#password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  // never let the form do a native submit (it would reload the page)
  $('#login-form').addEventListener('submit', (e) => e.preventDefault());

  const ctx = await CL.boot({ guestOnly: true });
  if (!ctx) return; // not configured (banner shown) or already logged in → redirected

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (!email || !password) return show('Enter your email and password.');

    const btn = $('#login-btn');
    setLoading(btn, true, 'Logging in…');
    const { error } = await CL.sb.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(btn, false);
      return show(/confirm/i.test(error.message)
        ? 'Please confirm your email first – check your inbox for the link.'
        : /invalid login/i.test(error.message) ? 'Wrong email or password.' : errMsg(error));
    }
    location.href = CL.nextUrl() || 'browse.html';
  });

  $('#forgot').addEventListener('click', async () => {
    const email = $('#email').value.trim();
    if (!email) return show('Type your email above first, then click "Forgot Password?".');
    const { error } = await CL.sb.auth.resetPasswordForEmail(email, { redirectTo: new URL('login.html', location.href).href });
    if (error) return show(errMsg(error));
    show('Password reset link sent – check your email.', true);
  });

  $('#google-btn').addEventListener('click', async () => {
    const { error } = await CL.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL(CL.nextUrl() || 'browse.html', location.href).href }
    });
    if (error) toast(errMsg(error), 'error');
  });
})();
