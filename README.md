# Wizbid

Contractor estimate app from **Bidding Wizards**. Paste a job in your own words, get an itemized bid: materials (qty × unit cost), labor (hours × rate), contingency %, markup %, bid total, profit, and margin.

Line totals are **plain arithmetic in the browser**. The “Read this job” button is an on-device n-gram / catalog matcher (no API key). Non-trade briefs are qualified out.

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
- Estimator: `#/bid`

Vite `base` is `./` and routing is `HashRouter` so GitHub Pages can host the `dist` folder at the repo root or a project URL.

## Pages deploy

Push to `main`. The workflow in `.github/workflows/pages.yml` builds `dist` and deploys with GitHub Pages. Enable Pages in the repo settings (source: GitHub Actions).
