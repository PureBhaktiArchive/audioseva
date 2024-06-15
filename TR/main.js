import { createApp } from 'vue';

const app = createApp({
  data() {
    return {
      devotees: [],
      selected: null,
    };
  },
  mounted() {
    fetch(import.meta.env.VITE_DEVOTEES_URL)
      .then((response) => response.json())

      .then(
        /** @param {Object[]} data */
        (data) => {
          this.devotees = data
            .filter((item) => !!item.emailaddress)
            .map((item) => ({
              value: item.emailaddress,
              label: item.name,
            }));
        }
      );
  },
});

app.mount('#app');
