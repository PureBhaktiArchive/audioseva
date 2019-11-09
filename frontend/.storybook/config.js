// Imports
import { configure, addDecorator, addParameters } from '@storybook/vue'
import { withA11y } from '@storybook/addon-a11y'
import { withKnobs } from '@storybook/addon-knobs'
import { INITIAL_VIEWPORTS } from "@storybook/addon-viewport";
import { withTemplate } from '~storybook/addon-show-vue-markup'
import { withVuetify } from '~storybook/addon-vuetify'
import StoryRouter from "storybook-vue-router";

addParameters({
  viewport: {
    viewports: INITIAL_VIEWPORTS,
  },
});

addDecorator(withA11y);
addDecorator(withKnobs);
addDecorator(withTemplate);
addDecorator(withVuetify);
addDecorator(StoryRouter());

configure(require.context('./stories', true, /\.stories\.js$/), module);
