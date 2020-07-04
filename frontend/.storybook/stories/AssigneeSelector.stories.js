import { boolean } from '@storybook/addon-knobs';
import AssigneeSelector from '../../src/components/AssigneeSelector';
import { storyFactory } from '../util/helpers';

export default { title: 'Assignee Selector' };

const story = storyFactory({
  AssigneeSelector,
});

const baseProps = (customProps = {}) => ({
  loading: {
    default: boolean('loading', true),
  },
  ...customProps,
});

export const asDefault = () =>
  story({
    props: baseProps(),
    template: `<assignee-selector :loading="loading"></assignee-selector>`,
  });
