import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      // See https://github.com/vuejs/core/tree/main/packages/vue#with-a-bundler
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  server: {
    ...(command === 'serve'
      ? {
          proxy: {
            // Proxying auth requests according to https://firebase.google.com/docs/auth/web/redirect-best-practices#proxy-requests
            // Loading env file according to https://vitejs.dev/config/#using-environment-variables-in-config
            '/__/auth': `https://${JSON.parse(loadEnv(mode, process.cwd()).VITE_FIREBASE_CONFIG).projectId}.firebaseapp.com`,
          },
        }
      : null),
    // This is needed due to https://github.com/firebase/firebase-js-sdk/issues/7342
    https: {
      pfx: fs.readFileSync('./localhost.pfx'),
      passphrase: '1',
    },
  },
}));
