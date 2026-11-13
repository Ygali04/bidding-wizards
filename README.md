# Bidding Wizards

Contractor estimate app from **Bidding Wizards**. Paste a job in your own words, get an itemized bid: materials (qty × unit cost), square-footage lines (L × W × $/sf), labor (hours × rate), contingency %, markup %, GST % (default 10), bid total (ex GST), GST line, GST-inclusive total, profit, and margin.

Line totals are **plain arithmetic in the browser**. The “Read this job” button is an on-device n-gram / catalog matcher (no API key). Non-trade briefs are qualified out.

**Blueprint take-off** on `#/bid` accepts a PDF. TypeSafe **Jev** (`@ai-sdk/typesafe-ai`, model `jev-latest`) classifies drawings vs job forms on `POST /api/documents` using `TYPESAFE_API_KEY`. Jev does not invent quantities — line counts stay canned (Tallowwood-style electrical set) until a parser lives on a server. GitHub Pages has no API, so the same heuristic runs in the browser.

Pasted job notes are still itemized by the on-device catalog; Jev (or the heuristic) can bump contingency when the form mentions occupied/hidden conditions.

## Run locally

```bash
npm install
npm test
npm run dev
```

Dev server: [http://127.0.0.1:5173](http://127.0.0.1:5173)

```bash
npm run build
npm run preview
```

Preview: [http://127.0.0.1:4173](http://127.0.0.1:4173)

- Landing: `/` (hash: `#/`)
- Estimator + blueprint mock: `#/bid`

Vite `base` is `./` and routing is `HashRouter` so GitHub Pages can host the `dist` folder at the repo root or a project URL.

## Pages deploy

Push to `main`. The workflow in `.github/workflows/pages.yml` builds `dist` and deploys with GitHub Pages. Enable Pages in the repo settings (source: GitHub Actions).
