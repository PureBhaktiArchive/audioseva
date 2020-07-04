import { action } from '@storybook/addon-actions';
import { boolean, object } from '@storybook/addon-knobs';
import SoundIssues from '../../src/components/SQRForm/SoundIssues';
import UnwantedParts from '../../src/components/SQRForm/UnwantedParts';
import { storyFactory } from '../util/helpers';

export default { title: 'SQRForm' };

const story = storyFactory({
  SoundIssues,
  UnwantedParts,
});

const formData = (path) => ({
  props: {
    form: {
      default: {
        [path]: object(path, [
          { beginning: '12:30', type: 'other type' },
          { beginning: '13:55' },
        ]),
      },
    },
    disabled: {
      default: boolean('disabled', false),
    },
  },
  methods: {
    updateForm: action('update form'),
    removeField: action('remove field'),
  },
});

export const soundIssues = () =>
  story({
    ...formData('soundIssues'),
    template: `
    <sound-issues
      :form="form"
      :disabled="disabled"
      :updateForm="updateForm"
      :removeField="removeField"
    ></sound-issues>
`,
  });

export const unwantedParts = () =>
  story({
    ...formData('unwantedParts'),
    template: `
    <unwanted-parts 
      :form="form" 
      :disabled="disabled"
      :updateForm="updateForm" 
      :removeField="removeField"
    ></unwanted-parts>
  `,
  });
