# CityPulse

A full-stack MVP: request businesses/restaurants to open in your city, upvote and
discuss requests, and discover nearby places (restaurants, cafes, attractions,
parks, malls) via the Foursquare Places API.

```
CityPulse/
├── backend/   Node.js + Express + TypeScript + PostgreSQL
└── frontend/  React + TypeScript + Tailwind CSS (Vite)
```

## Status

- **Database schema, migrations, and the full REST API**: implemented and verified
  (compiles, boots, and the mock Places endpoint has been smoke-tested).
- **Frontend**: implemented and verified (builds, dev server boots, and reaches
  the backend through the Vite proxy).
- **Places search / geocoding / autocomplete**: run in **mock mode by default**
  (`USE_MOCK_PLACES=true`). The mock service returns realistic fake places and
  geocodes a handful of well-known Indian localities, so the app works fully
  end-to-end with zero external setup or cost. See
  [Going live with the Foursquare API](#going-live-with-the-foursquare-api) to
  swap in real data — **verified working live** with real business names,
  addresses, and categories (e.g. real Koramangala restaurants/cafes).
- **No ratings/reviews on real data**: Foursquare's free tier doesn't include
  rating, review count, or photo fields (those are a paid-only tier) — the
  frontend detects this (`ratingsAvailable` in the search response) and hides
  the rating display and rating-based filters/sort options accordingly, rather
  than faking numbers. Mock mode still shows fake ratings for demo purposes.
- **Map view**: the Discovery page renders a lightweight, dependency-free mock
  map (`frontend/src/components/places/MapView.tsx`) that positions markers
  proportionally around the searched location. It does **not** call a real
  Maps JavaScript SDK (that would need a billed Google Maps key). Swapping in
  a real map library there is a drop-in replacement — the props already match
  what a real map component needs.
- **Auth/requests endpoints require a real PostgreSQL database** to actually
  persist data — that part cannot be verified without you provisioning a DB
  (see below). The error handling has been verified to fail cleanly (JSON 500,
  not a crash) when the DB isn't reachable.

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ running locally (or a connection string to a hosted instance)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Create the database (adjust to your local Postgres setup):

```bash
createdb citypulse
```

Edit `.env` if your Postgres isn't the default `postgres:postgres@localhost:5432`.
Leave `USE_MOCK_PLACES=true` to run without any external API setup.

Run the migrations, then start the API:

```bash
npm run migrate   # creates all 6 tables
npm run dev       # http://localhost:4000
```

Health check: `curl http://localhost:4000/api/health`

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000` (see
`frontend/vite.config.ts`), so the frontend and backend "just work" together
in development without CORS configuration on your part.

Open `http://localhost:5173`, register an account, and try:

1. Creating a business request (e.g. "Bring Third Wave Coffee from Bangalore
   to Hyderabad").
2. Upvoting it, commenting on it.
3. Registering a second account as a **verified business representative**
   and posting an official status update on that request.
4. Going to **Discover** and searching an area (try "Koramangala",
   "Indiranagar", "Banjara Hills", or any city/locality name) to see mock
   places with ratings, distance, and filters.

## Database schema

| Table              | Purpose                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `users`             | Accounts — role is one of `user`, `business_rep`, `admin`        |
| `requests`           | Business demand requests (the core feature)                     |
| `upvotes`            | One row per (request, user) — DB-level unique constraint prevents duplicate upvotes |
| `request_updates`    | Official progress updates / status-timeline entries              |
| `comments`           | Discussion thread on a request                                   |
| `saved_places`       | A user's bookmarked places from Discovery                        |

Migrations live in `backend/src/db/migrations/*.sql`, applied in order by
`backend/src/db/migrate.ts` (tracked in a `schema_migrations` table, so it's
safe to re-run — already-applied migrations are skipped).

## API endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/requests
GET    /api/requests            ?targetCity=&category=&status=&sort=top|new&page=&pageSize=
GET    /api/requests/:id
POST   /api/requests/:id/upvote
DELETE /api/requests/:id/upvote
POST   /api/requests/:id/updates     (business_rep or admin only)
POST   /api/requests/:id/comments

GET    /api/places/search       ?location=&category=&minRating=&minReviews=&radiusMeters=&sortBy=
GET    /api/places/autocomplete ?input=

GET    /api/me/saved-places
POST   /api/me/saved-places
DELETE /api/me/saved-places/:placeId
GET    /api/me/upvoted-requests
GET    /api/me/my-requests
```

The last five endpoints (under `/api/me`) aren't in the original spec's list
but were added to actually power the "user profile with saved places and
upvoted requests" and "business dashboard" pages — the spec described those
pages without listing the endpoints they need.

## Roles

- **user** — create requests, upvote, comment, save places.
- **business_rep** — everything a user can do, plus posting official updates
  and changing a request's status. Self-selected at registration for this MVP
  (there's no verification workflow yet — see Known simplifications below).
- **admin** — same permissions as `business_rep`. Never self-registrable;
  promote a user by hand: `UPDATE users SET role = 'admin' WHERE email = '...';`

## Known simplifications (MVP scope)

- Any user can register as `business_rep` directly — there's no real identity
  verification tying a rep to a specific business. In production this would
  need an approval workflow (e.g. an admin-reviewed verification request).
- A `business_rep` can post updates on *any* request, not just ones for their
  own business, since there's no ownership link between a rep and a business
  in the current schema.
- The Discovery map is a proportional mock visualization, not a real map (see
  Status above).
- Real (non-mock) place results have no rating, review count, or photo —
  Foursquare's free tier doesn't include them (see Status above).
- Category filtering against real Foursquare data is a loose text match
  (`query=restaurant`), not an exact match against Foursquare's own category
  ID taxonomy — mapping every app category to Foursquare's category tree was
  out of scope for this demo.
- Real geocoding/autocomplete has limited coverage for informal, hyperlocal
  names (e.g. small residential layouts like "AECS Layout") — Foursquare's
  free tier needs either strong global name recognition or a geographic bias
  (this app has no browser geolocation) to surface them. Well-known
  neighborhoods, landmarks, and cities resolve reliably; obscure local names
  sometimes don't. The error message when this happens is intentionally
  honest about the limitation rather than suggesting a workaround that
  doesn't actually help.

## Deploying CityPulse live

Recommended free stack for a demo: **Neon** (Postgres) + **Render** (backend) +
**Vercel** (frontend). None of these steps can be done from a terminal alone —
they involve creating accounts and clicking through each provider's dashboard,
so this is a checklist for you to follow rather than a script.

### 0. Push this repo to GitHub

Git is already initialized locally with everything committed, and the remote
is already set to https://github.com/Pavani-M/citypulse:

```bash
git push -u origin main
```

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (free, no card required).
2. Create a project → copy the connection string it gives you (starts with
   `postgresql://...`, includes `?sslmode=require`).
3. From your machine, run the migrations against it once:
   ```bash
   cd backend
   DATABASE_URL="<paste Neon connection string>" NODE_ENV=production npm run migrate
   ```

### 2. Backend — Render

1. Sign up at [render.com](https://render.com) and connect your GitHub account.
2. **New → Web Service** → select the `citypulse` repo.
3. Set **Root Directory** to `backend`.
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables (Render → Environment tab):
   - `DATABASE_URL` = the Neon connection string
   - `JWT_SECRET` = any long random string
   - `NODE_ENV` = `production`
   - `USE_MOCK_PLACES` = `true` or `false` — Foursquare's free tier (10,000
     calls/month) has no billing risk the way a Google key would, so it's
     reasonable to run this live on a public demo. See below for the key.
   - `FOURSQUARE_API_KEY` = your Foursquare API key (only needed if
     `USE_MOCK_PLACES=false`)
   - `CORS_ORIGIN` = your Vercel frontend URL (you'll get this in step 3 —
     come back and set it after)
7. Deploy. Note the resulting URL, e.g. `https://citypulse-backend.onrender.com`.
   Confirm it works: `curl https://citypulse-backend.onrender.com/api/health`

   Free-tier caveat: the service sleeps after 15 minutes of no traffic: the
   first request after a sleep can take ~30 seconds to wake up.

### 3. Frontend — Vercel

1. Sign up at [vercel.com](https://vercel.com), connect GitHub.
2. **Add New → Project** → select the `citypulse` repo.
3. Set **Root Directory** to `frontend` (Vercel auto-detects the Vite preset).
4. Add environment variable:
   - `VITE_API_URL` = `https://citypulse-backend.onrender.com/api` (your real
     Render URL + `/api`)
5. Deploy. Note the resulting URL, e.g. `https://citypulse.vercel.app`.
6. Go back to Render and set `CORS_ORIGIN` to that exact Vercel URL, then
   redeploy the backend so it takes effect.

### 4. Link it from the portfolio

Once both are live, send the Vercel URL over and it'll get wired into the
CityPulse card in the portfolio's "Things I've Built" section.

## Going live with the Foursquare API

1. Sign up for a free API key at
   [location.foursquare.com/developer](https://location.foursquare.com/developer/)
   (10,000 free calls/month, no card required).
2. In `backend/.env`, set `USE_MOCK_PLACES=false` and `FOURSQUARE_API_KEY=<your key>`.
   The real implementation already exists in
   `backend/src/services/places.service.ts` — nearby search, geocoding, and
   autocomplete all use Foursquare's `places-api.foursquare.com` endpoints
   (verified working live), gated behind that flag. No code changes needed.
3. Ratings, review counts, and photos are a **paid-only** tier on Foursquare
   — they're intentionally omitted from real results rather than faked. The
   frontend detects this via `ratingsAvailable` in the search response and
   hides rating UI/filters accordingly.
4. Replace `frontend/src/components/places/MapView.tsx` with a real map
   library if you want live map tiles instead of the mock visualization — the
   component's props (`center`, `places`, `onSelectPlace`) already match what
   a real map component would need.

**Why not Google Places or OpenStreetMap?** Google Places has real ratings
but requires a billing account (real, if generous, free credit). OpenStreetMap
Nominatim is fully free with no key, but its usage policy explicitly forbids
autocomplete-style query volume, and it returned "Access denied" when tested
from this environment — Foursquare's free tier turned out to be the best fit:
a real commercial API designed for this traffic pattern, at the cost of not
having free rating data.

## A note on the esbuild/Vite dev-server advisory

`npm audit` in `frontend/` will flag a moderate esbuild advisory
(GHSA-67mh-4wv8-2f99). It only affects the local dev server accepting
requests from arbitrary websites during `npm run dev` — not the production
build — and fixing it requires a breaking upgrade to Vite 8. Left as-is for
this MVP; revisit if this becomes a long-lived, more security-sensitive
project.
