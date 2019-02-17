<template>
  <v-radio-group :value="selectedField" v-bind="fieldProps" @change="handleRadioSelect">
    <template v-for="(field, index) in fields">
      <div class="other-option" v-if="isOtherOption(field)" :key="index">
        <v-expansion-panel :value="otherField">
          <v-expansion-panel-content hide-actions>
            <div slot="header">
              <v-radio :value="getFieldValue(field)" label="Other...">
              </v-radio>
            </div>
            <v-text-field @input="handleTextInput" :value="otherTextField" placeholder="Other"></v-text-field>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </div>
      <v-radio v-else :key="index" :value="getFieldValue(field)">
        <div v-html="getLabel(field)" slot="label"></div>
      </v-radio>
    </template>
  </v-radio-group>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import _ from "lodash";
import ItemPath from "@/mixins/ItemPath";

const statuses = [
  "blank space",
  "glitch",
  "irrelevant",
  "Background noise",
  "Volume",
  "Reverberation"
];

type Field = { label: string; value: string } | string;

@Component({
  name: "SoundTypeRadioGroup"
})
export default class SoundTypeRadioGroup extends Mixins<ItemPath>(ItemPath) {
  @Prop({ default: () => ({}) })
  fieldProps!: any;
  @Prop() fields!: Field[];
  otherField: any = 1;
  otherTextField = "";
  selectedField: any = null;

  mounted() {
    const fieldValue = _.get(this.form, this.itemPath);
    if (fieldValue === undefined) return;
    this.handleRadioSelect(fieldValue, true);
  }

  handleRadioSelect(value: any, mount = false) {
    if (statuses.includes(value)) {
      this.otherField = 2;
      this.updateForm(this.itemPath, value);
      this.selectedField = value;
    } else {
      this.selectedField = "other";
      this.otherField = 0;
      if (mount) {
        this.handleTextInput(value);
      } else {
        this.updateForm(this.itemPath, this.otherTextField || "other");
      }
    }
  }

  handleTextInput(e: any) {
    this.otherTextField = e;
    this.updateForm(this.itemPath, e);
  }

  getLabel(field: Field) {
    return typeof field === "string" ? field : field.label;
  }

  getFieldValue(field: Field) {
    return typeof field === "string" ? field : field.value;
  }

  isOtherOption(field: Field) {
    if (typeof field === "string") return false;
    return field.value === "other";
  }

  formData() {
    return _.get(this.form, this.itemPath);
  }
}
</script>

<style scoped>
>>> .other-option ul.v-expansion-panel {
  -webkit-box-shadow: none;
  box-shadow: none;
}

>>> .other-option .v-expansion-panel__header {
  padding: 0;
  min-height: auto;
}

>>> .other-option .v-expansion-panel__container {
  background-color: rgba(0, 0, 0, 0);
}
</style>
