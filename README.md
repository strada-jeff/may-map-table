# May Map Table

Interactive 4K touch map of Mayfair (New Braunfels, TX) for a kiosk table: pins for model homes and community locations, details with photos and a directions QR code, and routes drawn from "you are here".

- **App** (repo root): React + Vite, served from WP Engine's headless hosting.
- **CMS** (`cms/`): headless WordPress on WP Engine (`maytable`). Editors manage pins, builders, categories and kiosk copy; the app reads them from one REST endpoint.

```
may-map-table/
├── src/                 app
│   ├── data/            api.ts (CMS loading), schema.ts (validation), content.json (fallback snapshot)
│   ├── routing/         road graph, snapping, runtime route planner
│   └── types/pins.ts    content types: the source of truth for the CMS fields and endpoint
├── public/              artwork (base.svg → artwork-tiles/, overview.jpg), road network (network.svg), icons
├── tools/               build scripts (network, artwork tiles, Lottie, CMS map, content snapshot)
├── cms/
│   ├── theme/           WordPress theme: post types, ACF fields, endpoint, admin map field, content health
│   └── import/          spreadsheet import (content.json + images/<slug>/)
└── setup.sh             links cms/theme into a LocalWP site
```

## App

```bash
npm install
npm run dev        # http://localhost:5173, also on the LAN (--host)
```

Content comes from `VITE_CONTENT_URL`. For local work against the Local CMS, create `.env.development` (env files are gitignored):

```
VITE_CONTENT_URL=http://maytable.local/wp-json/maytable/v1/content
```

Without it, the app runs on the bundled snapshot. Add `?debug=1` (or use the on-screen Debug button) for the network, point-finding, touch and Lottie debug views.

### Where content comes from

1. **The CMS endpoint**, fetched once per page load and validated against `src/types/pins.ts` (`src/data/schema.ts`).
2. **The last good response**, kept in localStorage, if the CMS is unreachable or sends something invalid.
3. **`src/data/content.json`**, the snapshot built into the app.

When the table goes idle (welcome screen), it rechecks the CMS and reloads if the content's `version` changed — so published edits reach the table within one idle cycle, no deploy needed.

### Scripts

| Script | What it does |
|---|---|
| `npm run build` | Snapshot content (if reachable), build the network, typecheck, build the app |
| `npm run build:network` | `public/network.svg` → `src/data/generated/` (roads, origins) and `cms/theme/assets/map-data.json` |
| `npm run build:artwork` | `public/base.svg` → `public/artwork-tiles/`, then `build:cms-map`, `build:overview` and `build:pieces` |
| `npm run build:cms-map` | `public/base.svg` → `cms/theme/assets/map.webp`, the admin map field's image (animated art included) |
| `npm run build:overview` | `public/base.svg` → `public/overview.jpg`, the minimap's image |
| `npm run build:pieces` | `public/base.svg`'s `PIN` layers → `public/artwork-pieces/` and the catalog the app and CMS Artwork field read |
| `npm run build:lottie` | Lottie animations from `tools/lottie/` |
| `npm run snapshot:content` | CMS content → `src/data/content.json` (from `VITE_CONTENT_URL` or `-- <url>`) |

`build:network` and `build:artwork` write files the CMS uses too: commit what they change under `cms/theme/assets/`, or the admin places pins on stale roads or artwork.

### Artwork naming

`public/base.svg` is exported from the Illustrator template, `may-map-artwork-template-YYYY-MM-DD.ai` (kept outside the repo; save each new version with that day's date at the end). Every layer name becomes an SVG id (spaces → underscores) that the build looks up, so:

- **Name every layer, uniquely.** No `Layer 197`, `Isolation Mode` or repeated `Tree`s: number or place them (`Tree 7`, `House icon west`). Illustrator suffixes duplicates (`Car-2`) in an order nobody controls.
- **Letters, digits and spaces only.** `&` and `'` export as `_x26_`-style codes, and a trailing `-2` reads like Illustrator's duplicate suffix.
- **`PIN ` marks art the CMS can attach to a pin** (`PIN Swim club`). A place drawn as several layers gets one `PIN` layer around them; its children aren't prefixed.
- **Patterns:** `Label …` for place signs, `Street …` for street names, `<parent> part N` for unnamed pieces inside a named layer, `… unused` for hidden or empty layers kept around.
- **Renaming or regrouping changes no artwork** (Illustrator draws by stacking order, not name), but moving art to another layer can: it lands above or below different neighbors.
- **Animated scenery** finds its art by these ids (`tools/lottie/artwork-map.ts`). Renaming one of those layers means renaming it there too; `build:artwork` stops on an id it can't find.

Export with File → Export → Export As… → SVG, **Use Artboards** on: Styling *Internal CSS*, Font *Convert to Outlines*, Images *Embed*, Object IDs *Layer Names*, Decimal *2*, Minify and Responsive off.

## CMS

### Local setup

1. In [LocalWP](https://localwp.com), create a site named **`maytable`** (http://maytable.local).
2. Install and activate **ACF Pro**.
3. `bash setup.sh` — symlinks `cms/theme` into the site, so edits here are live.
4. WP Admin → Appearance → Themes: activate **May Map Table CMS**. Field groups load from `cms/theme/acf-json/`.
5. Check http://maytable.local/wp-json/maytable/v1/content.

Field groups edited in the ACF admin save back to `cms/theme/acf-json/` — commit them. Keep them in step with `src/types/pins.ts`, `cms/theme/inc/rest.php` and `src/data/schema.ts`; the schema rejects anything that drifts.

### Importing content

`cms/import/content.json` (gitignored) is the client's spreadsheet, normalized to the app's types. Photos go in `cms/import/images/<slug>/` (gitignored), added in filename order — prefix them `01-`, `02-`… The slug is the entry's id, e.g. `coventry-homes-groveton`, `mayfair-swim-club`, `highland-homes` (a builder's logo).

LocalWP's database is only reachable through its socket, so pass it to WP-CLI:

```bash
SOCK="$HOME/Library/Application Support/Local/run/<site-id>/mysql/mysqld.sock"
php -d mysqli.default_socket="$SOCK" "$(which wp)" \
  --path="$HOME/Local Sites/maytable/app/public" \
  eval-file cms/import/import.php
```

`<site-id>` is the folder under `run/` whose `conf/nginx/site.conf` mentions `maytable`. (Or run `wp eval-file …` from Local's "Open site shell".)

Re-running is safe: entries already in WordPress are left alone and only gain photos they don't have yet. Add `overwrite` after the file to reset their fields from `content.json`.

### What editors get

- **Model Homes, Locations, Builders, Categories**, and **Kiosk Settings** (help and sign-up copy). Only published entries reach the table; menu order sets the drawer order.
- **Map position field**: click or drag to place a pin, snap it onto a road, set the icon offset. Directions end where the pin meets the road, so it should sit at the entrance; more than 60 units from a road is flagged.
- **Kiosk Content** dashboard panel: every problem and unfinished item across the content, linked to the entry. Each entry's edit screen lists its own.

## Deploy

_To do: GitHub Actions deploying `cms/theme/` to the `maytable` WP Engine install, and the app to WP Engine's headless platform with `VITE_CONTENT_URL` set in the build environment._
