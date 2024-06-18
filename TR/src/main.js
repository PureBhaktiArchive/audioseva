import Aura from '@primevue/themes/aura';
import PrimeVue from 'primevue/config';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
// @ts-expect-error -- As of now there is a type mismatch https://github.com/orgs/primefaces/discussions/2160
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});
app.mount('#app');
