# CampusLoop

A campus marketplace where students **buy, sell, exchange and lend** books, electronics, furniture, stationery and lab equipment within their university.

- **Frontend:** plain HTML + Tailwind CSS (CDN) + vanilla JavaScript – no build step
- **Backend:** [Supabase](https://supabase.com) – Auth, Postgres (with Row Level Security) and Storage
- **Hosting:** any static host (Firebase Hosting config included)

## Pages

| File | What it does |
|---|---|
| `index.html` | Landing page, search, categories, featured items |
| `browse.html` | Search + filter (category, buy/exchange/lend) + sort, paginated |
| `item.html?id=…` | Item detail, photo gallery, seller info, **Buy / Request Exchange / Request to Lend** |
| `login.html`, `signup.html` | Email + password, Google, forgot password, profile photo |
| `upload.html` | Upload an item (up to 5 photos, price, condition, location, sell/exchange/lend) |
| `requests.html` | **Requests inbox** – Received & Sent, tabs for Buy / Exchange / Lending, accept / reject, contact reveal |
| `my-items.html` | Manage your listings (mark taken, relist, delete) |

## Setup (about 10 minutes)

### 1. Create the Supabase project
1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, click **Run**.
   This creates the tables, security rules (RLS), the accept/reject logic and the `campusloop` storage bucket.

### 2. Add your keys
Open `js/config.js` and fill in **Project Settings → API**:
```js
SUPABASE_URL: 'https://xxxx.supabase.co',
SUPABASE_ANON_KEY: 'eyJ…'   // the "anon / public" key – never the service_role key
```
Also edit `LOCATIONS` (campus meetup spots) and optionally `ALLOWED_EMAIL_DOMAIN` (e.g. `youruni.edu.in`) to accept only university emails.

### 3. Configure Auth (Supabase → Authentication)
- **Providers → Email:** for quick testing turn **off** "Confirm email"; for production keep it **on**.
- **URL Configuration:** set *Site URL* to where you host the app (e.g. `http://localhost:3000`) and add the same address under *Redirect URLs*.
- **Google sign-in (optional):** enable the Google provider with your OAuth client ID/secret. The "Continue with Google" buttons work only after this.

### 4. Run locally
Serve the folder over HTTP (opening the files directly with `file://` breaks auth):
```bash
npx serve .            # or:  python3 -m http.server 3000
```
Open the printed address, sign up, upload an item, then use a **second account** (another browser/incognito) to send buy/exchange/lend requests and watch them arrive in the inbox.

### 5. Deploy
- **Firebase Hosting:** `npm i -g firebase-tools && firebase login && firebase init hosting` (keep `.` as public dir, don't overwrite `firebase.json`) then `firebase deploy`.
- Netlify / Vercel / GitHub Pages also work – it is just static files.
Remember to add the live URL to Supabase *Site URL / Redirect URLs*.

## How requests work
1. A student opens an item and clicks **Buy Now**, **Request Exchange** (says what they offer) or **Request to Lend** (picks dates).
2. The owner sees it in **Requests → Received** and clicks **Accept** or **Reject**.
3. Accepting marks the item *sold / exchanged / lent*, and automatically declines other pending requests for it.
4. Both students can then tap **View contact details** (phone + email are only revealed after acceptance). Owners can relist an item from **My Items**.

## Security notes
- Row Level Security is on for every table. Anyone can read listings; only owners can edit them. Requests are visible only to the two students involved.
- Phone numbers and student IDs live in a private table and are never exposed to other users until a request is accepted.
- The browser only ever uses the public **anon** key. All permission checks are enforced by the database, not the JavaScript.
- All user text is HTML-escaped before display.

## Not included (ideas for later)
In-app chat, ratings/reviews, favourites, notifications by email, admin moderation, login by Student ID.
