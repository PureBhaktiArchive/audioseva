import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
// @ts-expect-error -- As of now there is a type mismatch https://github.com/orgs/primefaces/discussions/2160
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    // Enbling PrimeVue CSS layer to easily override styling with Tailwind: https://primevue.org/tailwind/#override
    options: {
      cssLayer: {
        name: 'primevue',
        order: 'tailwind-base, primevue, tailwind-utilities',
      },
    },
  },
});
// @ts-expect-error
app.use(ToastService);
app.mount('#app');
