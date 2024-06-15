import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

export default ({ mode }) => {
  // In order to access env vars below. See https://stackoverflow.com/a/66389044/3082178
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  // https://vitejs.dev/config/
  return defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        // See https://github.com/vuejs/core/tree/main/packages/vue#with-a-bundler
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },
    server: {
      proxy: {
        // Proxying auth requests according to https://firebase.google.com/docs/auth/web/redirect-best-practices#proxy-requests
        '/__/auth': `https://${JSON.parse(process.env.VITE_FIREBASE_CONFIG).projectId}.firebaseapp.com`,
      },
      // This is needed due to https://github.com/firebase/firebase-js-sdk/issues/7342
      https: {
        pfx: fs.readFileSync(process.env.TLS_CERT_FILE),
        passphrase: process.env.TLS_CERT_PASSPHRASE,
      },
    },
  });
};
