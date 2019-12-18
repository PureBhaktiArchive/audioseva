import { boolean } from "@storybook/addon-knobs";
import { storyFactory } from "../util/helpers";
import Autocomplete from "../../src/components/Autocomplete";

export default { title: "Autocomplete" };

const story = storyFactory({
  Autocomplete
});

const baseProps = (customProps = {}) => ({
  loading: {
    default: boolean("loading", true)
  },
  ...customProps
});

export const withDefaultText = () =>
  story({
    props: baseProps(),
    template: `<autocomplete label="Assignees" :loading="loading"></autocomplete>`
  });

export const withCustomText = () =>
  story({
    props: baseProps(),
    template: `
      <autocomplete label="Assignees" :loading="loading">
        <template v-slot:loading-text>Custom load text</template>
        <template v-slot:no-data>Custom no data</template>
      </autocomplete>
    `
  });
