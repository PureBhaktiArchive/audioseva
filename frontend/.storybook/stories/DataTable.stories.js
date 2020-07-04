import { action } from '@storybook/addon-actions';
import { object } from '@storybook/addon-knobs';
import Assignee from '../../src/components/Assignee';
import DataTable from '../../src/components/DataTable';
import InlineTextEdit from '../../src/components/InlineTextEdit';
import { storyFactory } from '../util/helpers';

export default { title: 'DataTable' };

const story = storyFactory({
  DataTable,
  Assignee,
  InlineTextEdit,
});

const getItems = () => {
  const assignees = [];
  for (let i = 0; i < 20; i++) {
    assignees.push({
      assignee: { name: `name-${i}`, emailAddress: `email-${i}` },
      description: `description-${i}`,
    });
  }
  return assignees;
};

const baseProps = (headers = []) => ({
  items: {
    default: object('items', getItems()),
  },
  headers: {
    default: object('headers', [
      ...headers,
      { text: 'Description', value: 'description' },
    ]),
  },
});

const assigneeHeaders = [{ text: 'Assignee', value: 'assignee' }];

export const asDefault = () =>
  story({
    props: baseProps(assigneeHeaders),
    data() {
      return {
        datatableProps: {
          page: 1,
          itemsPerPage: 3,
        },
      };
    },
    methods: {
      action: action('clicked row'),
    },
    template: `
    <div>
      <p>page: {{ datatableProps.page }}</p>
      <data-table 
        @click:row="action" 
        :options.sync="datatableProps" 
        :items="items"
        :headers="headers"
       >
        <template v-slot:assignee="{ item, value }">
         <assignee :item="item" :value="value"></assignee>
        </template>
      </data-table>
    </div>
  `,
  });

export const withInlineEditDescription = () =>
  story({
    props: baseProps(assigneeHeaders),
    methods: {
      save: action('save'),
      cancel: action('cancel'),
    },
    template: `
    <data-table :items="items" :headers="headers">
      <template v-slot:assignee="{ item, value }">
        <assignee :item="item" :value="value"></assignee>
      </template>
      <template v-slot:description="{ item, value }">
        <inline-text-edit @save="save" @cancel="cancel" :item="item" :value="value"></inline-text-edit>
      </template>
    </data-table>
  `,
  });

export const withTableRowStyle = () =>
  story({
    props: baseProps(),
    methods: {
      tableRowStyle: () => ({
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
      }),
    },
    template: `
    <data-table :items="items" :headers="headers" :tableRowStyle="tableRowStyle">
    </data-table>
  `,
  });

export const withTdStyles = () =>
  story({
    props: {
      ...baseProps(),
      classes: {
        default: object('classes', {
          description: { 'font-weight-bold': true },
        }),
      },
    },
    template: `<data-table :items="items" :headers="headers" :classes="classes"></data-table>`,
  });
