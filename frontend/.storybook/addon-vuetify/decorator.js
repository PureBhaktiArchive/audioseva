// Imports
import '@mdi/font/css/materialdesignicons.min.css';
import { makeDecorator } from '@storybook/addons';
// Utilities
import deepmerge from 'deepmerge';
import Vue from 'vue';
import Vuetify from 'vuetify';
// Vuetify
import 'vuetify/dist/vuetify.min.css';
import vuetifyOptions from '../../src/vuetifyOptions';

Vue.use(Vuetify);

export default makeDecorator({
  name: 'withVuetify',
  parameterName: 'vuetify',
  wrapper: (storyFn, context, { parameters = vuetifyOptions }) => {
    // Reduce to one new URL?
    const searchParams = new URL(window.location).searchParams;
    const dark = searchParams.get('eyes-variation') === 'dark';
    const rtl = searchParams.get('eyes-variation') === 'rtl';
    const vuetify = new Vuetify(
      deepmerge(
        {
          rtl,
          theme: { dark },
        },
        parameters
      )
    );
    const WrappedComponent = storyFn(context);

    return Vue.extend({
      vuetify,
      components: { WrappedComponent },
      template: `
        <v-app>
          <v-container fluid>
            <wrapped-component />
          </v-container>
        </v-app>
      `,
    });
  },
});
