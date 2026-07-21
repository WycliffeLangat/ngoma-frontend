# Ngoma Charts

Kenya's official multi-platform music charts. Singles and albums ranked across Apple Music, Audiomack, Boomplay, Spotify, YouTube and Shazam.

Ngoma Charts is backend-powered. All current, historical, and future chart data is stored in the Django backend/database and served through the public API. The React frontend does not bundle chart data; it only fetches and displays data from the configured backend API.

## Quick start

```bash
npm install
npm run dev          # local dev server at http://localhost:5173
```

## Build for production

```bash
npm run build        # outputs static files to dist/
npm run preview      # preview the production build locally
```

The `dist/` folder is a fully static site — host it anywhere (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, Nginx).

## Project structure

```
ngoma-charts/
├── index.html              # HTML entry + SEO meta tags
├── package.json
├── vite.config.js          # build config (with code-splitting)
├── netlify.toml            # Netlify deploy + SPA routing
├── vercel.json             # Vercel deploy + SPA routing
├── .env.example            # copy to .env to configure the backend URL
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # app shell
    ├── NgomaCharts.jsx     # the full application (all pages)
    └── index.css           # fonts + reset
```

Chart uploads, review, publication, historical records, rankings and metadata are managed in Django Admin. No generated chart dataset is committed to the frontend.

## Chart scoring

The Django API is authoritative for ranks and points. Weekly Top 100 source
charts use `101 - rank` raw points to build monthly platform and combined
rankings. Published Top 50 rows use `51 - rank` public points for display,
artists, certifications, analytics and history. The React app never repairs
or recalculates backend chart scores.

Regional charts are independently ranked from the complete pre-trim platform
candidate pool. Eligibility (for example `KE`) is applied before ranking and
before the public Top 50 cutoff; regional charts are never filtered from a
platform or Combined Top 50. Regional artist charts likewise use all eligible
regional release candidates before the singles and albums charts are trimmed.
A regional chart contains fewer than 50 rows only when fewer than 50 eligible
entries have source-platform activity.

## Configure the backend

Local development uses `/api/v1` and Vite proxies requests to the deployed
Railway API configured in `.env.development`. Run `npm run dev` to review
frontend changes without starting Django.

To use a local Django backend instead, add this ignored `.env.local` file and
restart Vite:

```env
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

Production hosting must set `VITE_API_BASE` to the public Django API URL before
building. Netlify is already configured to use `/api/v1` as a same-origin proxy
to Railway, which keeps CMS session cookies first-party.

At startup the public app uses the latest available public payload immediately: an injected `window.__NGOMA_PUBLIC_DATA__`, an inline `#ngoma-public-data-snapshot`, or the browser's cached `/app-data/` payload. The live API then refreshes in the background and swaps in newer CMS data when `/app-data/revision/` changes. A startup error is shown only when neither live data nor a cached/static public snapshot exists.

The **AI Analyst** is currently disabled and is not mounted in the public app.

## Deploy in one click

**Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod
```
(Build command `npm run build`, publish directory `dist` — already set in `netlify.toml`.)

**Vercel**
```bash
npm i -g vercel
vercel --prod
```
(Config already in `vercel.json`.)

**Any static host**: run `npm run build` and upload the `dist/` folder.

## Updating chart data

Upload, review and publish chart data through Django Admin. The public API and frontend automatically expose newly published months; no frontend chart-data edit or rebuild is required.

## Notes

- Share-as-image uses the Canvas API and works on any real host (the in-app preview fallback exists for sandboxed environments only).
