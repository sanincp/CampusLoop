(async function () {
  const { $, esc, icon, money, timeAgo, fmtDate, toast, errMsg, setLoading } = CL;

  const ctx = await CL.boot({ active: 'browse' });
  if (!ctx) return;
  const { user } = ctx;

  const page = $('#page');
  const id = new URLSearchParams(location.search).get('id');

  function notFound(msg) {
    page.innerHTML = `<div class="card p-12 text-center"><h1 class="text-2xl font-extrabold">Item not found</h1>
      <p class="text-gray-500 mt-2">${esc(msg || 'It may have been removed.')}</p>
      <a href="browse.html" class="btn btn-primary mt-6">Browse items</a></div>`;
  }
  if (!id) return notFound();

  const { data: item, error } = await CL.sb
    .from('items')
    .select('*, owner:profiles!owner_id(id, full_name, course_year, avatar_url, created_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) return notFound(errMsg(error));
  if (!item) return notFound();

  document.title = `${item.title} – CampusLoop`;
  const isOwner = !!user && user.id === item.owner_id;
  const t = CL.typeLabel(item);

  // count the view once per browser session
  try {
    const key = 'viewed:' + item.id;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      CL.sb.rpc('increment_views', { p_item: item.id }).then(() => {});
    }
  } catch (_) { /* storage can be blocked – ignore */ }

  // which request types has this user already sent (still pending)?
  let sent = new Set();
  if (user && !isOwner) {
    const { data } = await CL.sb.from('requests').select('type')
      .eq('item_id', item.id).eq('requester_id', user.id).eq('status', 'pending');
    sent = new Set((data || []).map((r) => r.type));
  }

  // ---------- render ----------
  const images = item.images && item.images.length ? item.images : [];
  let cur = 0;
  const o = item.owner || {};

  function actionButtons() {
    if (isOwner) {
      return `<div class="flex items-center gap-3 flex-wrap"><span class="chip chip-blue">This is your listing</span>
        <a href="my-items.html" class="btn btn-ghost btn-sm">Manage in My Items</a></div>`;
    }
    if (item.status !== 'available') {
      return `<span class="chip chip-red capitalize">${esc(item.status)} – no longer available</span>`;
    }
    const b = (type, cls, ic, label) => sent.has(type)
      ? `<button class="btn btn-ghost" disabled>${icon('check', 'w-4 h-4')} ${label} request sent</button>`
      : `<button class="btn ${cls}" data-req="${type}">${icon(ic, 'w-4 h-4')} ${label}</button>`;
    return `<div class="flex flex-wrap gap-3">
      ${t.sell ? b('buy', 'btn-primary', 'cart', 'Buy Now') : ''}
      ${t.exchange ? b('exchange', 'btn-outline', 'exchange', 'Request Exchange') : ''}
      ${t.lend ? b('lend', 'btn-outline', 'hand', 'Request to Lend') : ''}
    </div>`;
  }

  const availChips = [
    t.sell ? '<span class="chip chip-green">For Sale</span>' : '',
    t.exchange ? `<span class="chip chip-blue">${t.sell ? 'Also open to Exchange' : 'Open to Exchange'}</span>` : '',
    t.lend ? `<span class="chip chip-blue">${t.sell || t.exchange ? 'Also open to Lend' : 'Available to Lend'}</span>` : ''
  ].join('');

  const rows = [
    ['Title', item.title],
    ['Category', item.category],
    ['Condition', item.condition],
    t.sell ? ['Price', money(item.price) + (item.negotiable ? ' (negotiable)' : '')] : null,
    ['Available for', [t.sell && 'Sell', t.exchange && 'Exchange', t.lend && 'Lend'].filter(Boolean).join(', ')],
    item.exchange_for ? ['Preferred exchange', item.exchange_for] : null,
    ['Meetup location', item.location]
  ].filter(Boolean);

  page.innerHTML = `
    <nav class="text-sm text-gray-500 mb-4"><a href="index.html" class="hover:text-brand-600">Home</a> › <a href="browse.html?category=${encodeURIComponent(item.category)}" class="hover:text-brand-600">${esc(item.category)}</a> › <span class="text-ink">${esc(item.title)}</span></nav>
    <div class="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <div class="grid gap-6 min-w-0">
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <div class="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-line" id="gallery-main"></div>
            <div id="thumbs" class="mt-3 grid grid-cols-5 gap-2"></div>
          </div>
          <div class="flex flex-col gap-4">
            <div><span class="chip chip-blue">${esc(item.category)}</span></div>
            <h1 class="text-3xl font-extrabold leading-tight">${esc(item.title)}</h1>
            <div class="flex items-center gap-3 flex-wrap">
              ${t.sell ? `<span class="text-4xl font-extrabold text-brand-600">${money(item.price)}</span>` : ''}
              ${availChips}
            </div>
            <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 border-b border-line pb-4">
              <span class="inline-flex items-center gap-1.5">${icon('box', 'w-4 h-4')} ${esc(item.condition)}</span>
              <span class="inline-flex items-center gap-1.5">${icon('calendar', 'w-4 h-4')} Posted ${timeAgo(item.created_at)}</span>
              <span class="inline-flex items-center gap-1.5">${icon('eye', 'w-4 h-4')} ${item.views} view${item.views === 1 ? '' : 's'}</span>
              <span class="inline-flex items-center gap-1.5">${icon('pin', 'w-4 h-4')} ${esc(item.location)}</span>
            </div>
            <p class="text-gray-700 whitespace-pre-line">${esc(item.description)}</p>
            <div id="actions" class="mt-auto">${actionButtons()}</div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <section class="card p-5">
            <h2 class="font-bold text-lg mb-3">Product Details</h2>
            <dl class="rounded-xl border border-line overflow-hidden text-sm">
              ${rows.map(([k, v], i) => `<div class="grid grid-cols-[9rem_1fr] ${i % 2 ? 'bg-white' : 'bg-gray-50'}"><dt class="px-3 py-2.5 font-medium border-r border-line">${esc(k)}</dt><dd class="px-3 py-2.5">${esc(v)}</dd></div>`).join('')}
            </dl>
          </section>
          <section class="card p-5">
            <h2 class="font-bold text-lg mb-2">Description</h2>
            <p class="text-gray-700 text-sm whitespace-pre-line">${esc(item.description)}</p>
            <h3 class="font-bold mt-5 mb-1">Meetup Details</h3>
            <p class="text-sm text-gray-700">Suggested spot: ${esc(item.location)}. Agree on the exact time and place with the seller once your request is accepted.</p>
          </section>
        </div>
      </div>

      <aside class="grid gap-5">
        <section class="card p-5">
          <h2 class="font-bold text-lg mb-4">Seller Information</h2>
          <div class="flex items-center gap-4">
            ${CL.avatar(o, 'w-16 h-16')}
            <div class="min-w-0"><p class="font-bold text-lg truncate">${esc(o.full_name || 'Student')}</p>
              <p class="text-sm text-gray-600">${esc(o.course_year || '')}</p>
              <p class="text-sm text-gray-500">Joined ${o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</p></div>
          </div>
          <ul class="mt-4 pt-4 border-t border-line grid gap-3 text-sm">
            <li class="flex items-center gap-2.5">${icon('pin', 'w-4 h-4 text-gray-500')} ${esc(item.location)}</li>
            <li class="flex items-center gap-2.5 text-gray-700">${icon('shield', 'w-4 h-4 text-leaf-600')} Contact shared after the seller accepts your request</li>
          </ul>
        </section>
        <section class="card p-5">
          <h2 class="font-bold text-lg mb-3 flex items-center gap-2">${icon('shield', 'w-5 h-5 text-leaf-600')} Safety Tips</h2>
          <ul class="list-disc pl-5 grid gap-1.5 text-sm text-gray-700 marker:text-brand-600">
            <li>Meet in a safe, public location on campus.</li><li>Check the item before making payment.</li>
            <li>Do not share sensitive personal information.</li><li>Report suspicious activity.</li>
          </ul>
        </section>
        <section class="rounded-2xl bg-brand-50 p-5 flex gap-4 items-center">
          <span class="text-leaf-600">${icon('leaf', 'w-10 h-10')}</span>
          <div><p class="font-extrabold leading-tight">Small Actions.<br>A Greener Campus.</p>
          <p class="text-sm text-gray-600 mt-1">Give pre-loved items a new home and help reduce waste.</p></div>
        </section>
      </aside>
    </div>`;

  // ---------- gallery ----------
  function drawGallery() {
    const main = $('#gallery-main');
    if (!images.length) { main.innerHTML = CL.placeholder(item.category); $('#thumbs').innerHTML = ''; return; }
    main.innerHTML = `<img src="${esc(images[cur])}" alt="${esc(item.title)}" class="w-full h-full object-cover">
      ${images.length > 1 ? `<button data-nav="-1" class="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-9 h-9 shadow flex items-center justify-center" aria-label="Previous photo"><span class="rotate-90 inline-flex">${icon('chevron', 'w-5 h-5')}</span></button>
      <button data-nav="1" class="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-9 h-9 shadow flex items-center justify-center" aria-label="Next photo"><span class="-rotate-90 inline-flex">${icon('chevron', 'w-5 h-5')}</span></button>
      <span class="absolute bottom-3 right-3 bg-ink/70 text-white text-xs font-semibold rounded-full px-2.5 py-1">${cur + 1}/${images.length}</span>` : ''}`;
    $('#thumbs').innerHTML = images.length > 1 ? images.map((src, i) =>
      `<button data-thumb="${i}" class="aspect-[4/3] rounded-lg overflow-hidden border-2 ${i === cur ? 'border-brand-600' : 'border-transparent'}"><img src="${esc(src)}" alt="" class="w-full h-full object-cover"></button>`).join('') : '';
  }
  drawGallery();
  page.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    const th = e.target.closest('[data-thumb]');
    if (nav) { cur = (cur + Number(nav.dataset.nav) + images.length) % images.length; drawGallery(); }
    if (th) { cur = Number(th.dataset.thumb); drawGallery(); }
    const rq = e.target.closest('[data-req]');
    if (rq) openModal(rq.dataset.req);
  });

  // ---------- request modal ----------
  const modal = $('#modal');
  $('#req-close').innerHTML = icon('x', 'w-5 h-5');
  let reqType = null;

  const CONFIG = {
    buy: {
      title: 'Buy this item', sub: () => `${item.title} · ${money(item.price)}`,
      fields: () => `<div><label class="label" for="r-message">Message to seller</label>
        <textarea id="r-message" class="input" rows="4" maxlength="500">Hi, I'm interested in buying this. Is it still available? Can we meet on campus?</textarea></div>`
    },
    exchange: {
      title: 'Request an exchange', sub: () => item.exchange_for ? `Seller prefers: ${item.exchange_for}` : item.title,
      fields: () => `<div><label class="label" for="r-offered">What will you offer? <span class="req">*</span></label>
        <input id="r-offered" class="input" maxlength="120" required placeholder="e.g. Python Programming Book"></div>
        <div><label class="label" for="r-message">Message</label>
        <textarea id="r-message" class="input" rows="3" maxlength="500">Hi! I'd like to exchange my book for yours. Let me know if you're interested.</textarea></div>`
    },
    lend: {
      title: 'Request to borrow', sub: () => item.title,
      fields: () => {
        const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        return `<div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="r-start">From <span class="req">*</span></label><input id="r-start" type="date" class="input" min="${today}" required></div>
          <div><label class="label" for="r-end">Until <span class="req">*</span></label><input id="r-end" type="date" class="input" min="${today}" required></div></div>
          <div><label class="label" for="r-message">Message</label>
          <textarea id="r-message" class="input" rows="3" maxlength="500">Hi, I need this for my project. I will take good care of it.</textarea></div>`;
      }
    }
  };

  function openModal(type) {
    if (!user) {
      location.href = 'login.html?next=' + encodeURIComponent('item.html?id=' + item.id);
      return;
    }
    reqType = type;
    const c = CONFIG[type];
    $('#req-title').textContent = c.title;
    $('#req-sub').textContent = c.sub();
    $('#req-fields').innerHTML = c.fields();
    $('#req-error').classList.add('hidden');
    modal.classList.remove('hidden');
    const first = $('#req-fields input, #req-fields textarea');
    if (first) first.focus();
  }
  function closeModal() { modal.classList.add('hidden'); }
  $('#req-close').addEventListener('click', closeModal);
  $('#req-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  $('#req-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#req-error');
    err.classList.add('hidden');

    const row = {
      item_id: item.id, requester_id: user.id, owner_id: item.owner_id, type: reqType,
      message: ($('#r-message').value || '').trim() || null
    };
    if (reqType === 'exchange') row.offered_item = $('#r-offered').value.trim();
    if (reqType === 'lend') {
      row.start_date = $('#r-start').value;
      row.end_date = $('#r-end').value;
      if (row.end_date < row.start_date) {
        err.textContent = 'The return date must be on or after the start date.';
        err.classList.remove('hidden');
        return;
      }
    }

    const btn = $('#req-submit');
    setLoading(btn, true, 'Sending…');
    const { error: insErr } = await CL.sb.from('requests').insert(row);
    setLoading(btn, false);
    if (insErr) { err.textContent = errMsg(insErr); err.classList.remove('hidden'); return; }

    sent.add(reqType);
    $('#actions').innerHTML = actionButtons();
    closeModal();
    toast('Request sent! The seller will be notified.', 'success');
  });
})();
