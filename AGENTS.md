# AudioSeva — AGENTS.md

Monorepo with 7 independent sub-projects under one Firebase project. CI runs per changed path.

## Sub-projects

| Path         | Tech                                                  | Entry                                      | Node       | Key command     |
| ------------ | ----------------------------------------------------- | ------------------------------------------ | ---------- | --------------- |
| `frontend/`  | Vue 2 + Vuetify 2 + Vue CLI 4 + webpack 4             | `src/main.ts`                              | 18         | `npm run serve` |
| `functions/` | Firebase Functions + TypeScript (CommonJS)            | `src/index.ts` → globs `**/*.functions.js` | 20         | `npm run build` |
| `TR/`        | Vue 3 + Vite + PrimeVue 4 + Tailwind                  | `src/main.js`                              | latest LTS | `npm run dev`   |
| `cli/`       | TypeScript CLI (yargs, fluent-ffmpeg)                 | `src/index.ts`                             | >=16       | `npm run build` |
| `gas/`       | Google Apps Script + clasp (TE, Transcripts, CRP, FC) | TypeScript per sub-dir                     | >=18       | `npm run build` |
| `CR/`        | Static HTML/JS (vanilla Vue 2 via CDN)                | `index.html`                               | —          | none            |
| `website/`   | Drupal 8 Bootstrap subtheme                           | —                                          | —          | none            |

## Commands (run from each sub-project directory)

**frontend:** `npm run serve` (dev), `npm run build` (prod), `npm test` (Jest 26), `npm run lint` (ESLint 6)

**functions:** `npm run build` (tsc → `lib/`), `npm run build:watch`, `npm test` (Jest 29), `npm run lint`

**TR:** `npm run dev` (Vite, requires HTTPS + `localhost.pfx`), `npm run build`, `npm run lint`

**cli:** `npm run build` (tsc → `dist/`), `npm run start` (ts-node), `npm run install:locally` (npm link)

**gas:** `npm run build` (tsc), `npm run lint` (ESLint + TSEslint); deploy via `clasp push` from each sub-dir

## CI/CD (`.github/workflows/ci.yml`)

PRs trigger per-project matrix (via `dorny/paths-filter`):
`npm ci` → `npx prettier --check .` → `npm run lint -- --no-fix` → `npm run build` → `npm run test -- --ci`

## Production Deployment (`.github/workflows/deploy-production.yml`)

Push `master` → `production` to deploy:

```
git push origin master:production
```

This triggers GitHub Actions (`deployment.yml`): builds `frontend`+`functions`+`TR`, then runs `firebase deploy` with a service account.

## Architecture gotchas

- **Functions auto-register** via `globSync('./**/*.functions.js')` — each `.functions.ts` file becomes a module; exported function names become `{ModuleName}-{functionName}` on Firebase.
- **`@types/express-serve-static-core` pinned** in `functions/package.json` as workaround for `firebase-functions@5.x` declaring `@types/express@4.17.3` which uses a `*` range on core types. Remove the pin when upgrading to `firebase-functions@7+`.
- **`@types/node` pinned** in `cli/`, `functions/`, and `TR/` because lockfile maintenance pulls in newer versions (e.g., 26.x) that use TypeScript 5.6+ built-in types (`IteratorObject`, `BuiltinIteratorReturn`) incompatible with the pinned TypeScript 5.3.3 across all projects. Revisit when TypeScript is upgraded.
- **Postbuild copies emails:** `npm run build` runs tsc then `cp -r emails lib/`. If you add/remove email templates, the copy still happens.
- **TR dev needs HTTPS + auth proxy:** Vite dev server uses `localhost.pfx` (password `1`). Firebase auth is proxied through Vite; `authDomain` is patched at runtime in `firebase.js`.
- **TR requires `VITE_FIREBASE_CONFIG`** env var (JSON string). See `TR/.env.development.local`.
- **Frontend overrides are pinned** in `package.json`: webpack@4, css-loader@3, terser-webpack-plugin@2, react-dom@16. Do not bump without checking Vue CLI 4 compat.
- **All sub-projects pin exact versions** (`save-exact=true` in `.npmrc`). No `^` ranges.
- **Functions local debug:** place `credentials.json.local` in repo root, run `firebase functions:config:get > .runtimeconfig.json` once in `functions/`.
- **CR is plain HTML/JS** — no build step. Deployed as-is from `CR/` directory to Firebase Hosting.

## Renovate (`.renovaterc.json`)

- **Dashboard** — [#515](https://github.com/PureBhaktiArchive/audioseva/issues/515) tracks all pending, scheduled, open, and blocked updates. Check it before starting update work.
- **Minor/patch updates** — Handled autonomously by Renovate. `:automergeMinor` auto-merges these when CI passes. No manual action needed.
- **Major version bumps** — Require dashboard approval (checkbox on #515). Manual review needed for breaking changes.
- **Security alerts** — Labeled `security`, bypass the quarterly schedule, run at any time. Prioritize these.
- **Schedule** — Quarterly for non-security updates via `schedule:quarterly`.
- **Lock file maintenance** — Runs monthly via `:maintainLockFilesMonthly`. CI may fail from transitive `@types/*` bumps — pin the offending `@types/*` explicitly (see pinned types above).
- **PR limits** — Max 2/hour (`:prHourlyLimit2`), 10 concurrent (`:prConcurrentLimit10`).
- **Frontend** — Disabled (`"matchFileNames": ["frontend/**"]` → `"enabled": false`). No Renovate PRs for the frontend.
- **`googleapis`** — Auto-approved for all updates (no dashboard approval needed).
- **PrimeVue** — Grouped as a monorepo (`primevue` + `@primevue/themes` updated together).

### Update workflow

1. **Let Renovate handle minor/patch updates** — they auto-merge on green CI. No action required.
2. **Check the Dashboard** (#515) for:
   - *Pending Approval* — major version bumps needing manual review
   - *Awaiting Schedule* — minor/patch bumps waiting for quarterly (can trigger early via checkbox)
   - *Open* — existing PRs that may need CI diagnosis or merge
3. **For failed PRs** — common failure patterns:
   - Peer dependency conflicts → add `legacy-peer-deps=true` or npm overrides
   - Transitive `@types/*` regressions → pin the package explicitly
   - Breaking API changes in major bumps → code migration needed
4. **Risk guide** (from audit in #515):
   - *Low (auto-merge)*: patch/minor bumps, `@types/*`, prettier, ESLint minor, lodash
   - *Medium (manual review)*: `uuid`, `glob`, `yargs`, `email-templates`, `multi-integer-range` majors — doable with small code tweaks
   - *High (project-level effort)*: `vue` 2→3, `vuetify` 2→3, `tailwindcss` 3→4, `firebase` majors, `express` 5.x, ESM-only packages (`ora`, `p-map`) — require migration

## Style

- Prettier: singleQuote, semi, trailingComma es5, 2-space indent
- EditorConfig: LF, UTF-8, trim_trailing_whitespace=false
- Functions use header comment `/*! sri sri guru gauranga jayatah */`
- All lockfiles committed (npm)
