(async function () {
  const { $, icon, esc, CATEGORIES, CATEGORY_ICON } = CL;

  $('#yr').textContent = new Date().getFullYear();
  $('#hero-leaf').innerHTML = icon('leaf', 'w-3.5 h-3.5');

  $('#hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get('q').toString().trim();
    location.href = 'browse.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  $('#category-chips').innerHTML =
    `<a href="browse.html" class="choice active inline-flex items-center gap-2">${icon('grid', 'w-4 h-4')} All</a>` +
    CATEGORIES.map((c) =>
      `<a href="browse.html?category=${encodeURIComponent(c)}" class="choice inline-flex items-center gap-2">${icon(CATEGORY_ICON[c], 'w-4 h-4')} ${esc(c)}</a>`
    ).join('');

  const values = [
    ['users', 'Student Community', 'Buy, sell, exchange and lend within your campus.'],
    ['shield', 'Safe & Trusted', 'Only your campus community. Meet in safe public spots.'],
    ['leaf', 'Sustainable', 'Give items a new life and reduce waste.'],
    ['home', 'Better Campus', 'A cleaner, greener and more connected campus.']
  ];
  $('#values').innerHTML = values.map(([ic, t, d]) =>
    `<div class="flex gap-4 items-start"><span class="text-brand-600 mt-0.5">${icon(ic, 'w-8 h-8')}</span>
     <div><h3 class="font-bold">${t}</h3><p class="text-sm text-gray-600 mt-0.5">${d}</p></div></div>`).join('');

  const ctx = await CL.boot({ active: 'home' });
  const box = $('#featured');
  if (!ctx) {
    box.className = 'text-gray-500';
    box.textContent = 'Connect Supabase in js/config.js to see live listings.';
    return;
  }

  box.innerHTML = CL.skeletonCards(6);
  const { data, error } = await CL.sb
    .from('items')
    .select('*, owner:profiles!owner_id(full_name, course_year, avatar_url)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) { box.className = 'text-red-600'; box.textContent = CL.errMsg(error); return; }
  if (!data.length) {
    box.className = 'card p-10 text-center text-gray-500';
    box.innerHTML = `No items yet. <a class="text-brand-600 font-semibold" href="upload.html">Be the first to upload one →</a>`;
    return;
  }
  box.innerHTML = data.map(CL.itemCard).join('');
})();
