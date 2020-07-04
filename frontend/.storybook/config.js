// Imports
import { withA11y } from '@storybook/addon-a11y';
import { withKnobs } from '@storybook/addon-knobs';
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';
import { addDecorator, addParameters, configure } from '@storybook/vue';
import StoryRouter from 'storybook-vue-router';
import { withTemplate } from '~storybook/addon-show-vue-markup';
import { withVuetify } from '~storybook/addon-vuetify';

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
