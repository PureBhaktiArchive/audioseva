<template>
  <div>
    <data-table
      :computedComponent="computedComponent"
      :componentData="customData"
      :items="items"
      :headers="mappedHeaders"
    >
    </data-table>
    <v-btn color="success" @click="addField">
      <v-icon small left v-text="`$vuetify.icons.plus`" />
      Unwanted Part
    </v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import TextField from "@/components/Inputs/TextField.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import Button from "@/components/SQRForm/DeleteButton.vue";
import SoundIssuesMixin from "@/components/SQRForm/SoundIssuesMixin";
import SoundTypeRadioGroup from "@/components/SQRForm/SoundTypeRadioGroup.vue";

@Component({
  name: "UnwantedParts",
  components: { DataTable }
})
export default class UnwantedParts extends Mixins<SoundIssuesMixin>(
  SoundIssuesMixin
) {
  updatePath = "unwantedParts";

  formProps = {
    updateForm: this.updateForm,
    updatePath: this.updatePath
  };

  computedComponent = {
    beginning: TextField,
    ending: TextField,
    actions: Button,
    type: SoundTypeRadioGroup,
    description: TextArea
  };

  get customData() {
    return {
      ...this.componentData,
      beginning: {
        ...this.componentData.beginning,
        props: {
          ...this.componentData.beginning.props,
          form: this.form
        }
      },
      type: {
        ...this.componentData.type,
        props: {
          ...this.componentData.type.props,
          fields: [
            { label: "Blank space", value: "blank space" },
            { label: "Glitch", value: "glitch" },
            { label: "Irrelevant part", value: "irrelevant" },
            { label: "Other...", value: "other" }
          ]
        }
      }
    };
  }

  get items() {
    return Object.keys(this.form.unwantedParts);
  }
}
</script>

<style scoped>
</style>
