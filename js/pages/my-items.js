(async function () {
  const { $, esc, icon, money, timeAgo, toast, errMsg, setLoading } = CL;

  $('#new-btn').innerHTML = icon('plus', 'w-4 h-4') + ' Upload Item';

  const ctx = await CL.boot({ requireAuth: true, active: 'my-items' });
  if (!ctx) return;
  const { user } = ctx;

  const STATUS = {
    available: ['chip-green', 'Available'], sold: ['chip-gray', 'Sold'],
    exchanged: ['chip-blue', 'Exchanged'], lent: ['chip-amber', 'Lent out']
  };
  let items = [];
  let pendingByItem = {};

  async function load() {
    const list = $('#list');
    list.innerHTML = '<div class="skeleton h-32"></div><div class="skeleton h-32"></div>';
    const [i, r] = await Promise.all([
      CL.sb.from('items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      CL.sb.from('requests').select('item_id').eq('owner_id', user.id).eq('status', 'pending')
    ]);
    if (i.error) { list.innerHTML = `<p class="text-red-600">${esc(errMsg(i.error))}</p>`; return; }
    items = i.data;
    pendingByItem = {};
    (r.data || []).forEach((x) => { pendingByItem[x.item_id] = (pendingByItem[x.item_id] || 0) + 1; });
    render();
  }

  function row(it) {
    const t = CL.typeLabel(it);
    const [cls, label] = STATUS[it.status] || STATUS.available;
    const n = pendingByItem[it.id] || 0;
    const img = it.images && it.images[0]
      ? `<img src="${esc(it.images[0])}" alt="" class="w-full h-full object-cover">` : CL.placeholder(it.category);
    const types = [t.sell && 'Sell', t.exchange && 'Exchange', t.lend && 'Lend'].filter(Boolean).join(' · ');
    return `
      <article class="card p-4 flex gap-4 flex-wrap sm:flex-nowrap" data-id="${it.id}">
        <a href="item.html?id=${it.id}" class="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-line">${img}</a>
        <div class="flex-1 min-w-0">
          <div class="flex items-start gap-2 flex-wrap">
            <a href="item.html?id=${it.id}" class="font-bold hover:text-brand-600">${esc(it.title)}</a>
            <span class="chip ${cls}">${label}</span>
            ${n ? `<a href="requests.html" class="chip chip-red">${n} pending request${n > 1 ? 's' : ''}</a>` : ''}
          </div>
          <p class="text-brand-600 font-extrabold mt-0.5">${t.sell ? money(it.price) : esc(types)}</p>
          <p class="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>${esc(it.category)} · ${esc(it.condition)}</span><span>${esc(types)}</span>
            <span class="inline-flex items-center gap-1">${icon('eye', 'w-3.5 h-3.5')} ${it.views}</span><span>Posted ${timeAgo(it.created_at)}</span>
          </p>
        </div>
        <div class="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
          ${it.status === 'available'
            ? `<button class="btn btn-ghost btn-sm" data-act="taken">Mark as taken</button>`
            : `<button class="btn btn-outline btn-sm" data-act="relist">Make available again</button>`}
          <button class="btn btn-danger btn-sm" data-act="delete">${icon('trash', 'w-4 h-4')} Delete</button>
        </div>
      </article>`;
  }

  function render() {
    const list = $('#list');
    if (!items.length) {
      list.innerHTML = `<div class="card p-12 text-center text-gray-500">You haven't listed anything yet.
        <div class="mt-4"><a class="btn btn-primary btn-sm" href="upload.html">Upload your first item</a></div></div>`;
      return;
    }
    const live = items.filter((i) => i.status === 'available').length;
    $('#subtitle').textContent = `${items.length} item${items.length > 1 ? 's' : ''} · ${live} available`;
    list.innerHTML = items.map(row).join('');
  }

  $('#list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const it = items.find((x) => x.id === id);

    if (b.dataset.act === 'delete') {
      if (!confirm(`Delete "${it.title}"?\n\nThis also removes its requests and cannot be undone.`)) return;
      setLoading(b, true);
      const { error } = await CL.sb.from('items').delete().eq('id', id);
      if (error) { setLoading(b, false); return toast(errMsg(error), 'error'); }
      const paths = (it.images || []).map(CL.storagePath).filter(Boolean);
      if (paths.length) CL.sb.storage.from(CL.BUCKET).remove(paths);
      toast('Item deleted.', 'success');
    } else {
      const status = b.dataset.act === 'taken' ? 'sold' : 'available';
      setLoading(b, true);
      const { error } = await CL.sb.from('items').update({ status }).eq('id', id);
      if (error) { setLoading(b, false); return toast(errMsg(error), 'error'); }
      toast(status === 'available' ? 'Item is available again.' : 'Item marked as taken.', 'success');
    }
    await load();
  });

  load();
})();
