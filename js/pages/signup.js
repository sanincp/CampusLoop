(async function () {
  const { $, $$, icon, toast, errMsg, setLoading } = CL;

  $('#logo').innerHTML = CL.brandLogo('text-2xl');
  $('#logo-m').innerHTML = CL.brandLogo('text-2xl');
  $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, el.id === 'avatar-ph' ? 'w-8 h-8' : 'w-4 h-4'); el.classList.add('inline-flex'); });
  $('#perks').innerHTML = [['users', 'Connect with Students'], ['leaf', 'Give Items a New Life'], ['shield', 'A Safer & Trusted Marketplace']]
    .map(([ic, t]) => `<li class="flex items-center gap-3">${icon(ic, 'w-6 h-6 text-brand-600')}${t}</li>`).join('');

  const next = location.search.includes('next=') ? location.search : '';
  $('#to-login').href = 'login.html' + next;

  const msg = $('#msg');
  function show(text, ok) {
    msg.textContent = text;
    msg.className = 'text-sm rounded-lg px-3 py-2 ' + (ok ? 'bg-leaf-50 text-leaf-700' : 'bg-red-50 text-red-700');
  }

  $$('.pw-toggle').forEach((b) => b.addEventListener('click', () => {
    const inp = b.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }));

  // avatar preview
  let avatarFile = null;
  $('#avatar').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) { toast('Please choose a JPG or PNG photo.', 'error'); e.target.value = ''; return; }
    avatarFile = f;
    $('#avatar-prev').src = URL.createObjectURL(f);
    $('#avatar-prev').classList.remove('hidden');
    $('#avatar-ph').classList.add('hidden');
  });

  $('#signup-form').addEventListener('submit', (e) => e.preventDefault());
  const ctx = await CL.boot({ guestOnly: true });
  if (!ctx) return;

  $('#signup-form').addEventListener('submit', async () => {
    const v = {
      full_name: $('#full_name').value.trim(),
      student_id: $('#student_id').value.trim(),
      course: $('#course').value,
      year: $('#year').value,
      email: $('#email').value.trim().toLowerCase(),
      phone: $('#phone').value.replace(/[\s-]/g, ''),
      password: $('#password').value,
      confirm: $('#confirm').value
    };

    if (v.full_name.length < 2) return show('Please enter your full name.');
    if (!v.student_id) return show('Please enter your student ID.');
    if (!v.course || !v.year) return show('Please choose your course and year.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return show('Enter a valid email address.');
    const domain = (CL.cfg.ALLOWED_EMAIL_DOMAIN || '').toLowerCase();
    if (domain && !v.email.endsWith('@' + domain)) return show(`Please use your university email (@${domain}).`);
    if (!/^(\+91)?[6-9]\d{9}$/.test(v.phone)) return show('Enter a valid 10-digit phone number.');
    if (v.password.length < 8) return show('Password must be at least 8 characters.');
    if (v.password !== v.confirm) return show('Passwords do not match.');
    if (!$('#terms').checked) return show('Please accept the Terms of Service and Privacy Policy.');

    const btn = $('#signup-btn');
    setLoading(btn, true, 'Creating account…');

    const { data, error } = await CL.sb.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: new URL('login.html', location.href).href,
        data: {
          full_name: v.full_name,
          student_id: v.student_id,
          phone: v.phone,
          course_year: `${v.year}, ${v.course}`
        }
      }
    });

    if (error) { setLoading(btn, false); return show(errMsg(error)); }

    // Supabase returns a user with no identities when the email is already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(btn, false);
      return show('An account with this email already exists. Try logging in.');
    }

    // Signed in immediately (email confirmation off) → upload the photo now
    if (data.session) {
      if (avatarFile) {
        try {
          const url = await CL.uploadImage(avatarFile, data.user.id, 'avatar');
          await CL.sb.from('profiles').update({ avatar_url: url }).eq('id', data.user.id);
        } catch (err) { toast('Account created, but the photo could not be uploaded.', 'error'); }
      }
      location.href = CL.nextUrl() || 'browse.html';
      return;
    }

    // Email confirmation is on: ask them to verify first
    setLoading(btn, false);
    $('#signup-form').reset();
    show('Account created! We sent a confirmation link to your email – click it, then log in.', true);
  });

  $('#google-btn').addEventListener('click', async () => {
    const { error } = await CL.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL(CL.nextUrl() || 'browse.html', location.href).href }
    });
    if (error) toast(errMsg(error), 'error');
  });
})();
