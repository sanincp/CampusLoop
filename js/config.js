// =====================================================================
// CampusLoop configuration
// Supabase Dashboard → Project Settings → API → copy the Project URL and
// the "anon / public" key. (Never put the service_role key in frontend code.)
// =====================================================================
window.CAMPUSLOOP_CONFIG = {
  SUPABASE_URL: 'https://lmkzpqtjozraejofqrpj.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_8aovNLZSmYqPY98s3i2w0w_TkQF8gEq',

  // Meeting spots offered in the "Location on Campus" dropdown – edit freely
  LOCATIONS: [
    'Main Campus (Academic Block)',
    'Central Library',
    'Canteen / Food Court',
    'Boys Hostel',
    'Girls Hostel',
    'Admin Block',
    'Sports Complex'
  ],

  // Optional: only allow sign-ups from your university's email domain,
  // e.g. 'youruniversity.edu.in'. Leave empty to allow any email.
  ALLOWED_EMAIL_DOMAIN: ''
};
