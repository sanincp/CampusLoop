(async function () {
  const { $, esc, CATEGORIES } = CL;
  const PAGE = 20;
  let offset = 0;
  let timer = null;

  const ctx = await CL.boot({ active: 'browse' });
  if (!ctx) return;

  // --- filters from the URL ---
  const params = new URLSearchParams(location.search);
  $('#f-category').innerHTML =
    '<option value="">All categories</option>' +
    CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join('');
  $('#f-q').value = params.get('q') || '';
  $('#f-category').value = params.get('category') || '';
  $('#f-type').value = params.get('type') || '';
  $('#f-sort').value = params.get('sort') || 'new';

  function syncUrl() {
    const p = new URLSearchParams();
    if ($('#f-q').value.trim()) p.set('q', $('#f-q').value.trim());
    if ($('#f-category').value) p.set('category', $('#f-category').value);
    if ($('#f-type').value) p.set('type', $('#f-type').value);
    if ($('#f-sort').value !== 'new') p.set('sort', $('#f-sort').value);
    history.replaceState(null, '', 'browse.html' + (p.toString() ? '?' + p : ''));
  }

  async function load(reset) {
    const grid = $('#grid');
    if (reset) { offset = 0; grid.innerHTML = CL.skeletonCards(8); $('#more').classList.add('hidden'); }
    syncUrl();

    let q = CL.sb
      .from('items')
      .select('*, owner:profiles!owner_id(full_name, course_year, avatar_url)', { count: 'exact' })
      .eq('status', 'available');

    // strip characters that would break PostgREST's or() syntax
    const text = $('#f-q').value.trim().replace(/[,()%*\\]/g, ' ');
    if (text) q = q.or(`title.ilike.%${text}%,description.ilike.%${text}%`);
    if ($('#f-category').value) q = q.eq('category', $('#f-category').value);
    if ($('#f-type').value) q = q.contains('available_for', [$('#f-type').value]);

    const sort = $('#f-sort').value;
    if (sort === 'low') q = q.order('price', { ascending: true, nullsFirst: false });
    else if (sort === 'high') q = q.order('price', { ascending: false, nullsFirst: false });
    else q = q.order('created_at', { ascending: false });

    const { data, error, count } = await q.range(offset, offset + PAGE - 1);
    if (error) { grid.innerHTML = `<p class="col-span-full text-red-600">${esc(CL.errMsg(error))}</p>`; return; }

    if (reset) grid.innerHTML = '';
    if (!data.length && reset) {
      grid.innerHTML = `<div class="col-span-full card p-12 text-center text-gray-500">No items match your filters.
        <a href="upload.html" class="text-brand-600 font-semibold">Upload one →</a></div>`;
    } else {
      grid.insertAdjacentHTML('beforeend', data.map(CL.itemCard).join(''));
    }
    offset += data.length;
    $('#result-count').textContent = `${count ?? offset} item${(count ?? offset) === 1 ? '' : 's'} available`;
    $('#more').classList.toggle('hidden', offset >= (count ?? 0));
  }

  $('#f-q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => load(true), 300); });
  ['#f-category', '#f-type', '#f-sort'].forEach((s) => $(s).addEventListener('change', () => load(true)));
  $('#more').addEventListener('click', () => load(false));

  load(true);
})();
