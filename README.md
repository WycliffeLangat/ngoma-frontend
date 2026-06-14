# Ngoma Charts

Kenya's official multi-platform music charts. Singles and albums ranked across Apple Music, Audiomack, Boomplay, Spotify, YouTube and Shazam.

This is a production-ready React + Vite single-page app. It ships with the complete September 2025–May 2026 dataset bundled in, so **it works fully standalone with no backend**. When you deploy the Django backend, set one environment variable and it switches to live data automatically.

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
    ├── index.css           # fonts + reset
    └── data/
        └── chartData.js    # generated September 2025–May 2026 chart data
```

The app and the dataset are separated: `src/data/chartData.js` holds all the chart data, so updating data never touches the UI code.

## Connecting the backend (optional)

The app runs without a backend. To switch to live data from the Django backend:

1. Copy `.env.example` to `.env`
2. Set your deployed backend URL:
   ```
   VITE_API_BASE=https://api.ngomacharts.co.ke/api/v1
   ```
3. Rebuild. The app will ping the backend on load and show a green **LIVE** indicator when connected (it falls back to the bundled dataset if the backend is unreachable, so the site never breaks).

The **AI Analyst** also uses this: when `VITE_API_BASE` is set, it routes questions through your backend's `/ai/analyst/` endpoint (which holds your Anthropic API key securely server-side). See `ai_analyst.py` and `CONNECT_FRONTEND_TO_BACKEND.md` in the backend bundle.

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

Replace the contents of `src/data/chartData.js` with new month data (same shape), or — once the backend is live — set `VITE_API_BASE` and add months through the Django admin. No UI changes needed either way.

## Notes

- Browser storage (localStorage/sessionStorage) is intentionally not used.
- Share-as-image uses the Canvas API and works on any real host (the in-app preview fallback exists for sandboxed environments only).
