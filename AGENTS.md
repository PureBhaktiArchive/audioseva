# AudioSeva — AGENTS.md

Monorepo with 7 independent sub-projects under one Firebase project. CI runs per changed path.

## Sub-projects

| Path | Tech | Entry | Node | Key command |
|---|---|---|---|---|
| `frontend/` | Vue 2 + Vuetify 2 + Vue CLI 4 + webpack 4 | `src/main.ts` | 18 | `npm run serve` |
| `functions/` | Firebase Functions + TypeScript (CommonJS) | `src/index.ts` → globs `**/*.functions.js` | 20 | `npm run build` |
| `TR/` | Vue 3 + Vite + PrimeVue 4 + Tailwind | `src/main.js` | latest LTS | `npm run dev` |
| `cli/` | TypeScript CLI (yargs, fluent-ffmpeg) | `src/index.ts` | >=16 | `npm run build` |
| `gas/` | Google Apps Script + clasp (TE, Transcripts, CRP, FC) | TypeScript per sub-dir | >=18 | `npm run build` |
| `CR/` | Static HTML/JS (vanilla Vue 2 via CDN) | `index.html` | — | none |
| `website/` | Drupal 8 Bootstrap subtheme | — | — | none |

## Commands (run from each sub-project directory)

**frontend:** `npm run serve` (dev), `npm run build` (prod), `npm test` (Jest 26), `npm run lint` (ESLint 6)

**functions:** `npm run build` (tsc → `lib/`), `npm run build:watch`, `npm test` (Jest 29), `npm run lint`, `npm run deploy`

**TR:** `npm run dev` (Vite, requires HTTPS + `localhost.pfx`), `npm run build`, `npm run lint`

**cli:** `npm run build` (tsc → `dist/`), `npm run start` (ts-node), `npm run install:locally` (npm link)

**gas:** `npm run build` (tsc), `npm run lint` (ESLint + TSEslint); deploy via `clasp push` from each sub-dir

## CI/CD (`.github/workflows/ci.yml`)

PRs trigger per-project matrix (via `dorny/paths-filter`):
`npm ci` → `npx prettier --check .` → `npm run lint -- --no-fix` → `npm run build` → `npm run test -- --ci`

Production deployment: push to `production` branch → builds `frontend`+`functions`+`TR` → `firebase deploy`

## Architecture gotchas

- **Functions auto-register** via `globSync('./**/*.functions.js')` — each `.functions.ts` file becomes a module; exported function names become `{ModuleName}-{functionName}` on Firebase.
- **Postbuild copies emails:** `npm run build` runs tsc then `cp -r emails lib/`. If you add/remove email templates, the copy still happens.
- **TR dev needs HTTPS + auth proxy:** Vite dev server uses `localhost.pfx` (password `1`). Firebase auth is proxied through Vite; `authDomain` is patched at runtime in `firebase.js`.
- **TR requires `VITE_FIREBASE_CONFIG`** env var (JSON string). See `TR/.env.development.local`.
- **Frontend overrides are pinned** in `package.json`: webpack@4, css-loader@3, terser-webpack-plugin@2, react-dom@16. Do not bump without checking Vue CLI 4 compat.
- **Renovate disables frontend updates** (`"matchFileNames": ["frontend/**"]` → `"enabled": false`).
- **All sub-projects pin exact versions** (`save-exact=true` in `.npmrc`). No `^` ranges.
- **Functions local debug:** place `credentials.json.local` in repo root, run `firebase functions:config:get > .runtimeconfig.json` once in `functions/`.
- **CR is plain HTML/JS** — no build step. Deployed as-is from `CR/` directory to Firebase Hosting.

## Style

- Prettier: singleQuote, semi, trailingComma es5, 2-space indent
- EditorConfig: LF, UTF-8, trim_trailing_whitespace=false
- Functions use header comment `/*! sri sri guru gauranga jayatah */`
- All lockfiles committed (npm)
