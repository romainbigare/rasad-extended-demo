# RASAD extended design: static demo

A static, backend-free build of the **extended design** of the ADAFSA Agricultural Intelligence Platform
(Executive View, Crop / Tree / Land Use / Irrigation / Water / Yield modules, Farm Detail, Reports),
running on **placeholder data**. It is meant for walking people through the design, not for real use.

Live site: https://romainbigare.github.io/rasad-extended-demo/

## How it works

- **No backend.** A service worker (`public/mock-sw.js`, bundled from `demo/` by `npm run build:mock`)
  answers every request under `<base>/__mock/` with deterministic, generated data: 3 regions, 40 listed farms,
  243 fields, emirate totals scaled to 24,082 farms. First load registers the worker, then the app starts.
- **No sign-in.** The app opens straight on the Executive View with a placeholder session; the login and register pages redirect there and there is no log-out.
- **Maps** use [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)
  as the satellite basemap (demo build only; the production app uses the Google Map Tiles API). Crop type, land use and
  tree overlays are drawn by the service worker from the same placeholder farms (`demo/wms-render.js`); zoom into a farm
  and switch on *Date palm species* to see one dot per tree.
- The Executive View map opens with farm boundaries on and coloured by crop.

## Run locally

```bash
npm ci
npm run dev          # http://localhost:3001
```

Static build (as deployed): `NEXT_PUBLIC_BASE_PATH=/rasad-extended-demo npm run build`, output in `out/`.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages (`.github/workflows/pages.yml`).
In the repository settings, **Pages > Source** must be **GitHub Actions**.

All names, farms, owners and figures are placeholders and do not describe real holdings.
Imagery: Tiles © Esri, Maxar, Earthstar Geographics, and the GIS User Community.
