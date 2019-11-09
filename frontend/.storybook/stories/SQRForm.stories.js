import { object } from "@storybook/addon-knobs";
import { action } from "@storybook/addon-actions";
import { storyFactory } from "../util/helpers";
import SoundIssues from "../../src/components/SQRForm/SoundIssues";
import UnwantedParts from "../../src/components/SQRForm/UnwantedParts";

export default { title: "SQRForm" }

const story = storyFactory({
  SoundIssues,
  UnwantedParts
});

const formData = (path) => ({
  props: {
    form: {
      default: {
        [path]: object(path, [
          { beginning: "12:30", type: "other type" },
          { beginning: "13:55" }
        ])
      }
    }
  },
  methods: {
    updateForm: action("update form"),
    removeField: action("remove field")
  }
});

export const soundIssues = () => story({
  ...formData("soundIssues"),
  template: `
    <sound-issues
      :form="form"
      :updateForm="updateForm"
      :removeField="removeField"
    ></sound-issues>
`
});

export const unwantedParts = () => story({
  ...formData("unwantedParts"),
  template: `
    <unwanted-parts 
      :form="form" 
      :updateForm="updateForm" 
      :removeField="removeField"
    ></unwanted-parts>
  `
});
