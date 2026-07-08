# CityPulse

A full-stack MVP: request businesses/restaurants to open in your city, upvote and
discuss requests, and discover nearby places (restaurants, cafes, attractions,
parks, malls) via Google Places.

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
- **Google Maps / Places / Geocoding**: run in **mock mode by default**
  (`USE_MOCK_PLACES=true`). The mock service returns realistic fake places and
  geocodes a handful of well-known Indian localities, so the app works fully
  end-to-end with zero Google Cloud setup or cost. See
  [Going live with real Google APIs](#going-live-with-real-google-apis) to swap
  in real data.
- **Map view**: the Discovery page renders a lightweight, dependency-free mock
  map (`frontend/src/components/places/MapView.tsx`) that positions markers
  proportionally around the searched location. It does **not** call the real
  Google Maps JavaScript API (that requires a billed API key). Swapping in
  `@react-google-maps/api` there is a drop-in replacement — the props already
  match what a real map component needs.
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
Leave `USE_MOCK_PLACES=true` to run without any Google Cloud setup.

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
   - `USE_MOCK_PLACES` = `true` (**recommended for a public demo** — keeps a
     real Google API key, and its billing, out of a link random visitors can
     hit. Flip to `false` + add real keys only if you're comfortable with
     that exposure.)
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

## Going live with real Google APIs

1. Create a Google Cloud project, enable **Places API**, **Maps JavaScript
   API**, and **Geocoding API**, and create an API key.
2. In `backend/.env`, set `USE_MOCK_PLACES=false` and fill in
   `GOOGLE_PLACES_API_KEY` / `GOOGLE_GEOCODING_API_KEY`. The real
   implementations already exist in
   `backend/src/services/googlePlaces.service.ts` (Nearby Search + Geocoding),
   gated behind that flag — no code changes needed, just the env vars.
3. Restrict the API key (HTTP referrer for any browser-side use, IP for
   server-side) in Google Cloud Console before using a real key anywhere
   public.
4. Replace `frontend/src/components/places/MapView.tsx` with a real map
   (e.g. `@react-google-maps/api`) if you want live map tiles instead of the
   mock visualization — the component's props (`center`, `places`,
   `onSelectPlace`) already match what that library expects.

## A note on the esbuild/Vite dev-server advisory

`npm audit` in `frontend/` will flag a moderate esbuild advisory
(GHSA-67mh-4wv8-2f99). It only affects the local dev server accepting
requests from arbitrary websites during `npm run dev` — not the production
build — and fixing it requires a breaking upgrade to Vite 8. Left as-is for
this MVP; revisit if this becomes a long-lived, more security-sensitive
project.
