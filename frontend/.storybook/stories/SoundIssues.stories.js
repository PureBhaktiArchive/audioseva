import { object } from "@storybook/addon-knobs";
import { action } from "@storybook/addon-actions";
import { storyFactory } from "../util/helpers";
import SoundIssues from "../../src/components/SQRForm/SoundIssues";

export default { title: "SoundIssues" }

const story = storyFactory({
  SoundIssues
});

export const asDefault = () => story({
  props: {
    form: {
      default: {
        soundIssues: object("soundIssues", [
          { beginning: "12:30", type: "other type" },
          { beginning: "13:55" }
        ])
      }
    }
  },
  methods: {
    updateForm: action("update form"),
    removeField: action("remove field")
  },
  template: `
    <sound-issues
      :form="form"
      :updateForm="updateForm"
      :removeField="removeField"
    ></sound-issues>
`
});
