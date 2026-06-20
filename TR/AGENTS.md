# TR — Transcription Allotment Form

Vue 3 + Vite + PrimeVue 4 + Tailwind. No test framework configured.

## Local dev quirks

- Dev server requires HTTPS: uses `localhost.pfx` (password `1`). Needed because Firebase Auth treats `authDomain` as HTTPS.
- Firebase auth is proxied through Vite's dev server (`/__/auth` → firebaseapp.com).
- `authDomain` is patched at runtime in `src/firebase.js` to match the current host.
- Requires `VITE_FIREBASE_CONFIG` env var (JSON string). See `.env.development.local`.

## Project conventions

- **JSDoc** for type annotations in `.js` files; TypeScript only in `src/types.ts`.
- **Import order:** external (Vue → PrimeVue → Firebase) → components → internal modules.
- **User-facing errors:** PrimeVue Toast service (`toast.add({ severity: 'error', ... })`).
- **Firebase functions** called via `httpsCallable(getFunctions(), 'TR-getName')`.
- ESLint ignores `*.ts` files and `dist/`.
- Tailwind custom colors defined in `tailwind.config.js`; classes sorted via `prettier-plugin-tailwindcss`.

## Key files

| File              | Purpose                             |
| ----------------- | ----------------------------------- |
| `src/main.js`     | App entry, PrimeVue setup           |
| `src/firebase.js` | Firebase init + authDomain patching |
| `src/auth.js`     | Auth composable                     |
| `src/workflow.js` | Workflow state machine              |
| `src/types.ts`    | Shared TS type definitions          |
| `vite.config.js`  | Vite config (HTTPS, auth proxy)     |

## Stages

`TRSC` → `FC1` → `TTV` (defined in `workflow.js`).
