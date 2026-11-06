// =====================================================================
// CampusLoop – shared helpers (Supabase client, navbar, sidebar, cards…)
// Loaded on every page after config.js and the supabase-js CDN script.
// =====================================================================
(function () {
  'use strict';

  const cfg = window.CAMPUSLOOP_CONFIG || {};
  const configured =
    !!cfg.SUPABASE_URL && !!cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
    cfg.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

  const sb = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const BUCKET = 'campusloop';
  const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Stationery', 'Lab Equipment', 'Others'];
  const CATEGORY_ICON = {
    Books: 'book', Electronics: 'laptop', Furniture: 'sofa',
    Stationery: 'pencil', 'Lab Equipment': 'flask', Others: 'dots'
  };
  const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];

  // ---------- tiny utilities -----------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const ICONS = {
    cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    browse: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    exchange: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    id: '<rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h4"/><circle cx="9" cy="10" r="1.5"/><path d="M15 9h3"/><path d="M15 13h3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
    sofa: '<path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M5 18v2"/><path d="M19 18v2"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'
  };

  function icon(name, cls = 'w-5 h-5') {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function money(n) {
    if (n === null || n === undefined || n === '') return '';
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    const units = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for (const [sec, name] of units) {
      if (s >= sec) { const v = Math.floor(s / sec); return `${v} ${name}${v > 1 ? 's' : ''} ago`; }
    }
    return 'just now';
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function errMsg(e) {
    const m = (e && (e.message || e.error_description)) || String(e || 'Something went wrong');
    if (/duplicate key|requests_one_pending/i.test(m)) return 'You already have a pending request for this item.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Network problem. Check your connection and try again.';
    return m;
  }

  function toast(msg, type = 'info') {
    let box = $('#toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center px-4';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    const color = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-leaf-700' : 'bg-ink';
    t.className = `${color} text-white text-sm font-medium rounded-xl px-4 py-3 shadow-lg max-w-sm`;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spin"></span>${label ? ' ' + esc(label) : ''}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  function avatar(profile, size = 'w-10 h-10') {
    if (profile && profile.avatar_url) {
      return `<img src="${esc(profile.avatar_url)}" alt="" class="${size} rounded-full object-cover shrink-0 bg-brand-100">`;
    }
    return `<span class="${size} rounded-full bg-brand-100 text-brand-700 font-bold text-sm inline-flex items-center justify-center shrink-0">${esc(initials(profile && profile.full_name))}</span>`;
  }

  // ---------- images --------------------------------------------------
  async function compressImage(file, max = 1400, quality = 0.82) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose image files only (JPG or PNG).');
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process that image.'))), 'image/jpeg', quality));
  }

  async function uploadImage(file, uid, prefix = 'item') {
    const blob = await compressImage(file);
    const path = `${uid}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function storagePath(url) {
    const marker = `/${BUCKET}/`;
    const i = url.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  }

  // ---------- item card ----------------------------------------------
  function typeLabel(it) {
    const f = it.available_for || [];
    return { sell: f.includes('sell'), exchange: f.includes('exchange'), lend: f.includes('lend') };
  }

  function placeholder(cat, cls = 'w-full h-full') {
    return `<div class="${cls} bg-gradient-to-br from-brand-50 to-leaf-50 flex items-center justify-center text-brand-500">${icon(CATEGORY_ICON[cat] || 'box', 'w-10 h-10 opacity-70')}</div>`;
  }

  const CONDITION_CHIP = { New: 'chip-green', 'Like New': 'chip-blue', Good: 'chip-green', Fair: 'chip-amber', Used: 'chip-gray' };

  function itemCard(it) {
    const o = it.owner || {};
    const t = typeLabel(it);
    const priceHtml = t.sell
      ? `<p class="text-xl font-extrabold">${money(it.price)}${it.negotiable ? '<span class="text-xs font-medium text-gray-500 ml-1">negotiable</span>' : ''}</p>`
      : `<p class="text-lg font-extrabold text-brand-600">${t.exchange ? 'Exchange' : 'Lend'}</p>`;
    const extras = [];
    if (t.sell && t.exchange) extras.push('<span class="chip chip-blue">Exchange</span>');
    if ((t.sell || t.exchange) && t.lend) extras.push('<span class="chip chip-blue">Lend</span>');
    const unavailable = it.status !== 'available'
      ? `<span class="absolute top-2 left-2 chip chip-red capitalize">${esc(it.status)}</span>` : '';
    const img = it.images && it.images[0]
      ? `<img src="${esc(it.images[0])}" alt="${esc(it.title)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">`
      : placeholder(it.category);
    return `
      <a href="item.html?id=${esc(it.id)}" class="card group overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition">
        <div class="relative aspect-[4/3] overflow-hidden bg-gray-100">${img}${unavailable}</div>
        <div class="p-3.5 flex flex-col gap-1 flex-1">
          <h3 class="font-semibold text-[15px] leading-snug line-clamp-2">${esc(it.title)}</h3>
          ${priceHtml}
          <p class="text-sm text-gray-500">${esc(it.category)}</p>
          <div class="flex flex-wrap gap-1.5 mt-0.5">
            <span class="chip ${CONDITION_CHIP[it.condition] || 'chip-gray'}">${esc(it.condition)}</span>${extras.join('')}
          </div>
          <div class="mt-auto pt-3 flex items-center gap-2 text-xs text-gray-500">
            ${avatar(o, 'w-6 h-6')}
            <div class="min-w-0 flex-1"><p class="font-medium text-ink truncate">${esc(o.full_name || 'Student')}</p>
            <p class="truncate">${esc(o.course_year || '')}</p></div>
            <span class="shrink-0">${timeAgo(it.created_at)}</span>
          </div>
        </div>
      </a>`;
  }

  function skeletonCards(n = 8) {
    return Array.from({ length: n }, () => '<div class="skeleton h-72"></div>').join('');
  }

  // ---------- layout: top bar & sidebar ------------------------------
  function brandLogo(cls = 'text-xl') {
    return `<a href="index.html" class="flex items-center gap-2 font-extrabold ${cls} text-ink">${icon('cap', 'w-7 h-7 text-brand-600')}<span>Campus<span class="text-brand-600">Loop</span></span></a>`;
  }

  function renderTopbar(user, profile, pending, active) {
    const host = $('#topbar');
    if (!host) return;
    const link = (href, label, key) =>
      `<a href="${href}" class="text-sm font-medium px-1 py-1 border-b-2 ${active === key ? 'border-brand-600 text-brand-600' : 'border-transparent text-ink hover:text-brand-600'}">${label}</a>`;

    const right = user
      ? `<a href="requests.html" class="relative p-2 rounded-full hover:bg-gray-100" aria-label="Requests">${icon('bell', 'w-5 h-5')}${pending ? `<span class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>` : ''}</a>
         <details class="relative" id="user-menu">
           <summary class="list-none cursor-pointer flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100">
             ${avatar(profile, 'w-8 h-8')}<span class="hidden sm:block text-sm font-semibold max-w-[8rem] truncate">${esc(profile ? profile.full_name : 'Me')}</span>${icon('chevron', 'w-4 h-4 text-gray-500')}
           </summary>
           <div class="absolute right-0 mt-2 w-48 card p-1.5 shadow-lg text-sm">
             <a href="my-items.html" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">${icon('box', 'w-4 h-4')} My Items</a>
             <a href="requests.html" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">${icon('inbox', 'w-4 h-4')} Requests ${pending ? `<span class="ml-auto chip chip-red">${pending}</span>` : ''}</a>
             <button id="logout-btn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left text-red-600">${icon('logout', 'w-4 h-4')} Log out</button>
           </div>
         </details>`
      : `<a href="login.html" class="btn btn-outline btn-sm">Login</a><a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>`;

    host.innerHTML = `
      <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
        <div class="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          ${brandLogo()}
          <form id="nav-search" class="hidden md:flex flex-1 max-w-xl relative" role="search">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">${icon('search', 'w-4 h-4')}</span>
            <input name="q" class="input has-icon !bg-gray-50 !py-2" placeholder="Search for books, electronics, furniture…" autocomplete="off">
          </form>
          <nav class="hidden md:flex items-center gap-5 ml-auto">${link('index.html', 'Home', 'home')}${link('browse.html', 'Browse', 'browse')}${link('upload.html', 'Upload', 'upload')}</nav>
          <div class="flex items-center gap-2 ml-auto md:ml-0">${right}</div>
        </div>
        <nav class="md:hidden flex gap-5 px-4 pb-2 overflow-x-auto">
          ${link('index.html', 'Home', 'home')}${link('browse.html', 'Browse', 'browse')}${link('upload.html', 'Upload', 'upload')}
          ${user ? link('my-items.html', 'My Items', 'my-items') + link('requests.html', 'Requests' + (pending ? ` (${pending})` : ''), 'requests') : ''}
        </nav>
      </header>`;

    $('#nav-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = new FormData(e.target).get('q').toString().trim();
      location.href = 'browse.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
    const lo = $('#logout-btn');
    if (lo) lo.addEventListener('click', async () => { await sb.auth.signOut(); location.href = 'index.html'; });
  }

  // close the user dropdown when clicking elsewhere (registered once)
  document.addEventListener('click', (e) => {
    const m = $('#user-menu');
    if (m && m.open && !m.contains(e.target)) m.open = false;
  });

  // re-count pending requests and redraw the bell + sidebar badge
  async function refreshBadges(ctx, active) {
    const { count } = await sb.from('requests').select('id', { count: 'exact', head: true })
      .eq('owner_id', ctx.user.id).eq('status', 'pending');
    ctx.pending = count || 0;
    renderTopbar(ctx.user, ctx.profile, ctx.pending, active);
    renderSidebar(active, ctx.pending);
  }

  function renderSidebar(active, pending) {
    const host = $('#sidebar');
    if (!host) return;
    const item = (href, ic, label, key, badge) =>
      `<a href="${href}" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] font-medium ${active === key ? 'bg-brand-100 text-brand-700' : 'text-ink hover:bg-gray-100'}">
        ${icon(ic, 'w-5 h-5')}<span>${label}</span>${badge ? `<span class="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.4rem] h-6 px-1.5 inline-flex items-center justify-center">${badge}</span>` : ''}</a>`;
    host.innerHTML = `
      <div class="sticky top-16 p-4 flex flex-col gap-1 h-[calc(100vh-4rem)]">
        ${item('index.html', 'home', 'Home', 'home')}
        ${item('browse.html', 'browse', 'Browse', 'browse')}
        ${item('upload.html', 'plusCircle', 'Upload Item', 'upload')}
        ${item('my-items.html', 'box', 'My Items', 'my-items')}
        ${item('requests.html', 'inbox', 'Requests', 'requests', pending)}
        <div class="mt-auto rounded-2xl bg-gradient-to-b from-brand-50 to-leaf-50 p-5">
          ${icon('leaf', 'w-8 h-8 text-leaf-600')}
          <p class="mt-3 text-2xl font-extrabold leading-tight">Reuse.<br>Share.<br>Support.</p>
          <p class="mt-1 text-xl font-extrabold leading-tight text-leaf-700">A Greener<br>Campus.</p>
        </div>
      </div>`;
  }

  function setupBanner() {
    const el = document.createElement('div');
    el.className = 'bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-3 text-center';
    el.innerHTML = '<strong>Supabase is not configured yet.</strong> Open <code class="bg-amber-100 px-1 rounded">js/config.js</code> and add your project URL and anon key (see README).';
    document.body.prepend(el);
  }

  // ---------- boot ----------------------------------------------------
  // Every page calls CL.boot({...}) first. Returns { user, profile, pending }
  // or null when the page should stop (not configured / redirecting to login).
  async function boot(opts = {}) {
    if (!sb) {
      setupBanner();
      renderTopbar(null, null, 0, opts.active);
      return null;
    }
    const { data: { session } } = await sb.auth.getSession();
    const user = session ? session.user : null;

    if (opts.requireAuth && !user) {
      const here = location.pathname.split('/').pop() + location.search;
      location.replace('login.html?next=' + encodeURIComponent(here));
      return null;
    }
    if (opts.guestOnly && user) {
      location.replace(nextUrl() || 'browse.html');
      return null;
    }

    let profile = null, pending = 0;
    if (user) {
      const [p, c] = await Promise.all([
        sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        sb.from('requests').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('status', 'pending')
      ]);
      profile = p.data;
      pending = c.count || 0;
    }
    renderTopbar(user, profile, pending, opts.active);
    renderSidebar(opts.active, pending);
    return { user, profile, pending };
  }

  function nextUrl() {
    const n = new URLSearchParams(location.search).get('next');
    // only allow same-site relative page names
    return n && /^[a-z0-9\-_]+\.html(\?[^\s]*)?$/i.test(n) ? n : null;
  }

  window.CL = {
    cfg, configured, sb, BUCKET, CATEGORIES, CATEGORY_ICON, CONDITIONS,
    $, $$, esc, icon, money, timeAgo, fmtDate, errMsg, toast, setLoading, avatar,
    uploadImage, storagePath, itemCard, skeletonCards, placeholder, typeLabel,
    brandLogo, boot, nextUrl, CONDITION_CHIP, refreshBadges
  };
})();
