(async function () {
  const { $, esc, icon, toast, errMsg, setLoading, CATEGORIES, CONDITIONS } = CL;

  // static bits first so the page looks right even before auth resolves
  $('#plus-ic').innerHTML = icon('plus', 'w-5 h-5');
  $('#post-arrow').innerHTML = icon('arrow', 'w-4 h-4');
  $('#tips-title').innerHTML = icon('bulb', 'w-5 h-5 text-brand-600') + ' Tips for a Great Listing';
  $('#tips').innerHTML = [
    'Use a clear and descriptive title', 'Add good-quality photos', 'Mention the condition honestly',
    'Include important details', 'Set a fair price', 'Be responsive to student requests'
  ].map((t) => `<li class="flex items-center gap-3"><span class="w-5 h-5 rounded-full bg-brand-600 text-white inline-flex items-center justify-center">${icon('check', 'w-3 h-3')}</span>${t}</li>`).join('');

  $('#category').innerHTML = CATEGORIES.map((c) => `<option>${esc(c)}</option>`).join('');
  $('#location').innerHTML = (CL.cfg.LOCATIONS || ['Main Campus']).map((l) => `<option>${esc(l)}</option>`).join('');

  // condition = single choice, available-for = multi choice
  let condition = 'Good';
  const available = new Set(['sell']);

  function drawConditions() {
    $('#conditions').innerHTML = CONDITIONS.map((c) =>
      `<button type="button" class="choice ${c === condition ? 'active' : ''}" data-cond="${esc(c)}">${esc(c)}</button>`).join('');
  }
  function drawAvailable() {
    const opts = [['sell', 'Sell', 'cart'], ['exchange', 'Exchange', 'exchange'], ['lend', 'Lend', 'hand']];
    $('#available').innerHTML = opts.map(([k, label, ic]) =>
      `<button type="button" class="choice inline-flex items-center gap-2 ${available.has(k) ? 'active' : ''}" data-avail="${k}" aria-pressed="${available.has(k)}">${icon(ic, 'w-4 h-4')} ${label}</button>`).join('');
    // price only matters when the item is for sale
    const sell = available.has('sell');
    $('#price-box').classList.toggle('opacity-40', !sell);
    $('#price').disabled = !sell;
    $('#negotiable').disabled = !sell;
  }
  drawConditions();
  drawAvailable();

  $('#conditions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cond]');
    if (b) { condition = b.dataset.cond; drawConditions(); }
  });
  $('#available').addEventListener('click', (e) => {
    const b = e.target.closest('[data-avail]');
    if (!b) return;
    const k = b.dataset.avail;
    if (available.has(k)) { if (available.size > 1) available.delete(k); } else available.add(k);
    drawAvailable();
  });

  $('#description').addEventListener('input', (e) => { $('#desc-count').textContent = e.target.value.length; });

  // ----- images -----
  const MAX = 5;
  let files = []; // { file, url }
  function drawImages() {
    $$thumbs().forEach((n) => n.remove());
    const add = $('#add-img');
    files.forEach((f, i) => {
      const d = document.createElement('div');
      d.className = 'thumb relative w-28 h-28 rounded-xl overflow-hidden border border-line';
      d.innerHTML = `<img src="${f.url}" alt="" class="w-full h-full object-cover">
        <button type="button" data-rm="${i}" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 shadow flex items-center justify-center" aria-label="Remove photo">${icon('x', 'w-3.5 h-3.5')}</button>`;
      add.parentElement.appendChild(d);
    });
    add.classList.toggle('hidden', files.length >= MAX);
  }
  function $$thumbs() { return Array.from(document.querySelectorAll('#imgs .thumb')); }

  $('#file').addEventListener('change', (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = '';
    for (const f of picked) {
      if (files.length >= MAX) { toast(`You can add up to ${MAX} photos.`, 'error'); break; }
      if (!/^image\/(png|jpeg)$/.test(f.type)) { toast(`"${f.name}" is not a JPG or PNG.`, 'error'); continue; }
      if (f.size > 15 * 1024 * 1024) { toast(`"${f.name}" is too large (max 15 MB).`, 'error'); continue; }
      files.push({ file: f, url: URL.createObjectURL(f) });
    }
    drawImages();
  });
  $('#imgs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (!b) return;
    const [removed] = files.splice(Number(b.dataset.rm), 1);
    URL.revokeObjectURL(removed.url);
    drawImages();
  });

  // ----- submit -----
  $('#item-form').addEventListener('submit', (e) => e.preventDefault());
  const ctx = await CL.boot({ requireAuth: true, active: 'upload' });
  if (!ctx) return;
  const { user } = ctx;

  const errBox = $('#form-error');
  function fail(msg) { errBox.textContent = msg; errBox.classList.remove('hidden'); errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  $('#item-form').addEventListener('submit', async () => {
    errBox.classList.add('hidden');

    const title = $('#title').value.trim();
    const description = $('#description').value.trim();
    const sell = available.has('sell');
    const priceRaw = $('#price').value;

    if (title.length < 3) return fail('Please enter a title (at least 3 characters).');
    if (!description) return fail('Please add a description.');
    if (sell && (priceRaw === '' || Number(priceRaw) < 0 || Number.isNaN(Number(priceRaw)))) return fail('Please enter a price (or untick "Sell").');

    const btn = $('#post-btn');
    setLoading(btn, true, files.length ? 'Uploading photos…' : 'Posting…');

    let urls = [];
    try {
      urls = await Promise.all(files.map((f) => CL.uploadImage(f.file, user.id)));
    } catch (err) {
      setLoading(btn, false);
      return fail('Photo upload failed: ' + errMsg(err));
    }

    const { data, error } = await CL.sb.from('items').insert({
      owner_id: user.id,
      title,
      category: $('#category').value,
      description,
      price: sell ? Number(priceRaw) : null,
      negotiable: sell && $('#negotiable').checked,
      condition,
      location: $('#location').value,
      available_for: Array.from(available),
      exchange_for: $('#exchange_for').value.trim() || null,
      images: urls
    }).select('id').single();

    if (error) {
      // don't leave orphaned photos in storage
      const paths = urls.map(CL.storagePath).filter(Boolean);
      if (paths.length) CL.sb.storage.from(CL.BUCKET).remove(paths);
      setLoading(btn, false);
      return fail(errMsg(error));
    }

    toast('Your item is live!', 'success');
    location.href = 'item.html?id=' + data.id;
  });
})();
