import { object } from "@storybook/addon-knobs";
import { action } from "@storybook/addon-actions";
import { storyFactory } from "../util/helpers";
import DataTable from "../../src/components/DataTable";
import Assignee from "../../src/components/Assignee.vue";

export default { title: "DataTable" }

const story = storyFactory({
  DataTable,
  Assignee
});

const getAssignees = () => {
  const assignees = [];
  for (let i = 0; i < 20; i++) {
    assignees.push({ assignee: { name: `name-${i}`, emailAddress: `email-${i}` } })
  }
  return assignees;
};

export const asDefault = () => story({
  props: {
    items: {
      default: object("items", getAssignees())
    },
    headers: {
      default: object("headers", [{ text: "Assignee", value: "assignee"}])
    },
    computedComponent: {
      default: {
        assignee: Assignee
      }
    }
  },
  data() {
    return {
      datatableProps: {
        page: 1,
        itemsPerPage: 3
      }
    };
  },
  methods: {
    action: action("clicked row")
  },
  template: `
    <div>
      <p>page: {{ datatableProps.page }}</p>
      <data-table 
        @click:row="action" 
        :options.sync="datatableProps" 
        :computedComponent="computedComponent" 
        :items="items"
        :headers="headers"
       ></data-table>
    </div>
  `
});
