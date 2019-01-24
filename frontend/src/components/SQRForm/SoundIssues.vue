<template>
  <div>
    <data-table
      :computedComponent="computedComponent"
      :componentData="customData"
      :items="items"
      :headers="mappedHeaders"
      :styles="styles"
    >
    </data-table>
    <v-btn color="success" @click="addField">Add</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import TextField from "@/components/Inputs/TextField.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import Button from "@/components/SQRForm/DeleteButton.vue";
import SoundIssuesType from "@/components/SQRForm/SoundIssuesType.vue";
import Checkbox from "@/components/Inputs/Checkbox.vue";
import SoundIssuesMixin from "@/components/SQRForm/SoundIssuesMixin";
import _ from "lodash";

@Component({
  name: "SoundIssues",
  components: { DataTable }
})
export default class SoundIssues extends Mixins<SoundIssuesMixin>(
  SoundIssuesMixin
) {
  updatePath = "soundIssues";

  formProps = {
    updateForm: this.updateForm,
    updatePath: this.updatePath
  };

  computedComponent = {
    beginning: TextField,
    ending: TextField,
    actions: Button,
    type: SoundIssuesType,
    description: TextArea,
    entireFile: Checkbox
  };

  styles = {
    beginning: this.hideField,
    ending: this.hideField
  };

  hideField(value: any, item: any) {
    const field = _.get(
      this.form,
      `${this.updatePath}.${item}.entireFile`,
      false
    );
    return {
      hidden: field
    };
  }

  get customData() {
    return {
      ...this.componentData,
      entireFile: {
        props: {
          ...this.formProps,
          form: this.form
        }
      }
    };
  }

  get items() {
    return Object.keys(this.form.soundIssues);
  }

  get mappedHeaders(): any[] {
    return [{ text: "Entire file", value: "entireFile" }, ...this.headers].map(
      (header: any) => ({ ...header, sortable: false })
    );
  }
}
</script>

<style>
.hidden {
  opacity: 0;
}
</style>
