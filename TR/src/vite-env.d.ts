/**
 * According to https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_CONFIG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
