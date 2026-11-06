(async function () {
  const { $, $$, esc, icon, money, timeAgo, fmtDate, toast, errMsg, setLoading } = CL;

  $('#filter-title').innerHTML = icon('search', 'w-5 h-5') + ' Filter Requests';
  $('#how-title').innerHTML = icon('info', 'w-5 h-5') + ' How it works?';
  $('#leaf-ic').innerHTML = icon('leaf', 'w-9 h-9');

  const ctx = await CL.boot({ requireAuth: true, active: 'requests' });
  if (!ctx) return;
  const { user } = ctx;

  const TYPES = {
    buy: { label: 'Buy Requests', short: 'Buy', icon: 'cart', sub: 'Students who want to buy your items.' },
    exchange: { label: 'Exchange Requests', short: 'Exchange', icon: 'exchange', sub: 'Students who want to exchange items with yours.' },
    lend: { label: 'Lending Requests', short: 'Lending', icon: 'hand', sub: 'Students who want to borrow your items.' }
  };
  const STATUS_CHIP = { pending: 'chip-amber', accepted: 'chip-green', rejected: 'chip-red', cancelled: 'chip-gray' };

  let direction = 'received';       // 'received' | 'sent'
  let tab = 'all';                  // 'all' | buy | exchange | lend
  const cache = { received: null, sent: null };

  // ---------- data ----------
  async function fetchRequests(dir) {
    const personFk = dir === 'received' ? 'requester_id' : 'owner_id';
    const mine = dir === 'received' ? 'owner_id' : 'requester_id';
    const { data, error } = await CL.sb
      .from('requests')
      .select(`*, item:items(id, title, price, images, category, exchange_for),
               person:profiles!${personFk}(full_name, course_year, avatar_url)`)
      .eq(mine, user.id)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    cache[dir] = data;
    return data;
  }

  // ---------- rendering ----------
  function filtered(rows) {
    const status = $('#f-status').value;
    let out = rows.filter((r) => (tab === 'all' || r.type === tab) && (!status || r.status === status));
    if ($('#f-sort').value === 'old') out = out.slice().reverse();
    return out;
  }

  function drawTabs(rows) {
    const pend = (t) => rows.filter((r) => r.status === 'pending' && (t === 'all' || r.type === t)).length;
    const tabs = [['all', 'All Requests', 'inbox'], ...Object.entries(TYPES).map(([k, v]) => [k, v.label, v.icon])];
    $('#tabs').innerHTML = tabs.map(([k, label, ic]) => {
      const n = pend(k);
      return `<button data-tab="${k}" class="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-brand-600 text-brand-600 bg-brand-50/60' : 'border-transparent text-ink hover:text-brand-600'}">
        ${icon(ic, 'w-4 h-4')}${label}${n ? `<span class="bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center">${n}</span>` : ''}</button>`;
    }).join('');
  }

  function detailLine(r) {
    if (r.type === 'buy') return `<p class="text-lg font-extrabold text-brand-600">${money(r.item && r.item.price)}</p>`;
    if (r.type === 'exchange') return `<p class="text-sm text-gray-600">Offered in exchange: <span class="font-semibold text-ink">${esc(r.offered_item || '—')}</span></p>`;
    return `<p class="text-sm text-gray-600 inline-flex items-center gap-1.5">${icon('calendar', 'w-4 h-4')} <span class="font-semibold text-ink">${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}</span></p>`;
  }

  function actionArea(r) {
    if (r.status === 'pending' && direction === 'received') {
      return `<div class="flex gap-2.5">
        <button class="btn btn-danger btn-sm" data-act="reject" data-id="${r.id}">${icon('x', 'w-4 h-4')} Reject</button>
        <button class="btn btn-primary btn-sm" data-act="accept" data-id="${r.id}">${icon('check', 'w-4 h-4')} Accept</button></div>`;
    }
    if (r.status === 'pending' && direction === 'sent') {
      return `<button class="btn btn-ghost btn-sm" data-act="cancel" data-id="${r.id}">Cancel request</button>`;
    }
    if (r.status === 'accepted') {
      return `<button class="btn btn-outline btn-sm" data-act="contact" data-id="${r.id}">${icon('phone', 'w-4 h-4')} View contact details</button>`;
    }
    return `<span class="chip ${STATUS_CHIP[r.status]} capitalize">${esc(r.status)}</span>`;
  }

  function card(r) {
    const it = r.item || {};
    const p = r.person || {};
    const img = it.images && it.images[0]
      ? `<img src="${esc(it.images[0])}" alt="" class="w-full h-full object-cover">`
      : CL.placeholder(it.category);
    const who = direction === 'received' ? '' : '<span class="text-xs text-gray-500">Seller</span>';
    return `
      <article class="card p-4 sm:p-5" id="req-${r.id}">
        <div class="flex gap-4">
          <a href="item.html?id=${esc(it.id)}" class="w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-line">${img}</a>
          <div class="flex-1 min-w-0 grid gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <a href="item.html?id=${esc(it.id)}" class="font-bold hover:text-brand-600 block truncate">${esc(it.title || 'Item removed')}</a>
                ${detailLine(r)}
              </div>
              <div class="text-right shrink-0 text-xs text-gray-500">
                <p>${timeAgo(r.created_at)}</p>
                ${r.status !== 'pending' ? `<span class="chip ${STATUS_CHIP[r.status]} capitalize mt-1">${esc(r.status)}</span>` : ''}
              </div>
            </div>
            <div class="grid sm:grid-cols-[11rem_1fr] gap-3 items-start">
              <div class="flex items-center gap-2.5 min-w-0">
                ${CL.avatar(p, 'w-10 h-10')}
                <div class="min-w-0"><p class="font-semibold text-sm truncate">${esc(p.full_name || 'Student')}</p>
                <p class="text-xs text-gray-500 truncate">${esc(p.course_year || '')} ${who}</p></div>
              </div>
              ${r.message ? `<p class="text-sm bg-gray-50 border border-line rounded-xl px-3.5 py-2.5 text-gray-700 whitespace-pre-line">${esc(r.message)}</p>` : '<span></span>'}
            </div>
            <div class="flex justify-end" data-actions>${actionArea(r)}</div>
            <div data-contact class="hidden"></div>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const rows = cache[direction] || [];
    drawTabs(rows);
    const list = $('#list');
    const shown = filtered(rows);

    if (!shown.length) {
      list.innerHTML = `<div class="card p-12 text-center text-gray-500">
        ${direction === 'received' ? 'No requests for your items yet.' : "You haven't sent any requests yet."}
        <div class="mt-4"><a class="btn btn-primary btn-sm" href="${direction === 'received' ? 'upload.html' : 'browse.html'}">${direction === 'received' ? 'Upload an item' : 'Browse items'}</a></div></div>`;
      return;
    }

    // group by type, like the sections in the design
    const types = tab === 'all' ? Object.keys(TYPES) : [tab];
    list.innerHTML = types.map((t) => {
      const group = shown.filter((r) => r.type === t);
      if (!group.length) return '';
      const sub = direction === 'received' ? TYPES[t].sub : `Requests you sent to ${t === 'buy' ? 'buy' : t === 'exchange' ? 'exchange' : 'borrow'} items.`;
      return `<section class="grid gap-3">
        <div><h2 class="text-lg font-extrabold">${TYPES[t].label} (${group.length})</h2><p class="text-sm text-gray-500">${sub}</p></div>
        ${group.map(card).join('')}</section>`;
    }).join('');
  }

  async function load(dir, force) {
    $('#subtitle').textContent = dir === 'received' ? 'Manage incoming requests for your items.' : 'Track the requests you sent to other students.';
    $$('#direction button').forEach((b) => {
      const on = b.dataset.dir === dir;
      b.className = 'px-4 py-1.5 rounded-lg ' + (on ? 'bg-brand-600 text-white' : 'text-ink hover:bg-gray-100');
    });
    if (force || !cache[dir]) {
      $('#list').innerHTML = '<div class="skeleton h-40"></div><div class="skeleton h-40"></div>';
      try { await fetchRequests(dir); }
      catch (e) { $('#list').innerHTML = `<p class="text-red-600">${esc(errMsg(e))}</p>`; return; }
    }
    render();
  }

  // ---------- actions ----------
  async function act(kind, id, btn) {
    if (kind === 'accept' && !confirm('Accept this request?\n\nThe item will be marked as taken and other pending requests for it will be declined.')) return;
    setLoading(btn, true);
    let error = null;
    if (kind === 'accept' || kind === 'reject') {
      ({ error } = await CL.sb.rpc('respond_to_request', { p_request: id, p_accept: kind === 'accept' }));
    } else if (kind === 'cancel') {
      ({ error } = await CL.sb.from('requests').update({ status: 'cancelled' }).eq('id', id));
    }
    if (error) { setLoading(btn, false); return toast(errMsg(error), 'error'); }

    toast(kind === 'accept' ? 'Request accepted – contact details are now shared.' : kind === 'reject' ? 'Request rejected.' : 'Request cancelled.', 'success');
    await fetchRequests(direction);
    if (direction === 'received') cache.sent = null; // statuses may have changed on both sides
    render();
    CL.refreshBadges(ctx, 'requests');
  }

  async function showContact(id, btn, article) {
    const box = $('[data-contact]', article);
    if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
    setLoading(btn, true);
    const { data, error } = await CL.sb.rpc('get_request_contact', { p_request: id });
    setLoading(btn, false);
    const c = data && data[0];
    if (error || !c) return toast(error ? errMsg(error) : 'Contact details are not available.', 'error');
    box.innerHTML = `<div class="rounded-xl bg-leaf-50 border border-leaf-100 p-4 text-sm grid gap-1.5">
      <p class="font-bold text-leaf-700">Contact ${esc(c.full_name)} to finalize</p>
      ${c.phone ? `<p class="flex items-center gap-2">${icon('phone', 'w-4 h-4')} <a class="font-semibold text-brand-600" href="tel:${esc(c.phone)}">${esc(c.phone)}</a></p>` : ''}
      ${c.email ? `<p class="flex items-center gap-2">${icon('mail', 'w-4 h-4')} <a class="font-semibold text-brand-600" href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}
      <p class="text-xs text-gray-500 mt-1">Meet in a safe, public spot on campus and check the item before paying.</p></div>`;
    box.classList.remove('hidden');
  }

  // ---------- events ----------
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    $('#f-type').value = tab === 'all' ? '' : tab;
    render();
  });
  $('#f-type').addEventListener('change', (e) => { tab = e.target.value || 'all'; render(); });
  ['#f-status', '#f-sort'].forEach((s) => $(s).addEventListener('change', render));
  $('#direction').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dir]');
    if (b && b.dataset.dir !== direction) { direction = b.dataset.dir; load(direction, false); }
  });
  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const kind = b.dataset.act;
    if (kind === 'contact') showContact(b.dataset.id, b, b.closest('article'));
    else act(kind, b.dataset.id, b);
  });

  load('received', true);
})();
