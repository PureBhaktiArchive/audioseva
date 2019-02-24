<template>
  <div>
    <v-card class="my-3" v-for="(item, index) in items" :key="index">
      <v-card-title>
        <v-layout justify-space-around row wrap>

          <v-flex align-self-center xs12 class="d-flex justify-space-around pa-2" lg12>
            <v-flex xs5>
              <span>Sound issue #{{ index + 1}}</span>
            </v-flex>
            <v-flex :style="{ display: 'flex', justifyContent: 'flex-end' }" xs5>
              <delete-button v-bind="getFieldProps(item, 'actions')" />
            </v-flex>
          </v-flex>

          <v-flex xs12>
            <v-divider></v-divider>
          </v-flex>

          <v-flex align-self-center xs12 sm5 md5 lg1>
            <checkbox v-bind="getFieldProps(item, 'entireFile')"></checkbox>
          </v-flex>
          <V-flex xs5 class="hidden-lg-and-up hidden-xs-only" />

          <v-flex
            :class="hideField('beginning', item)"
            align-self-center
            class="d-flex justify-space-around"
            :style="{ flexWrap: 'wrap', flexDirection: 'column' }"
            xs12
            sm5
            lg2
          >
            <v-flex xs12>
              <text-field v-bind="getFieldProps(item, 'beginning')"></text-field>
            </v-flex>
            <v-flex xs12>
              <text-field v-bind="getFieldProps(item, 'ending')"></text-field>
            </v-flex>
          </v-flex>
          <v-flex align-self-center xs12 sm5 lg3>
            <sound-type-radio-group v-bind="getFieldProps(item, 'type')"></sound-type-radio-group>
          </v-flex>
          <v-flex align-self-center xs12 lg5>
            <text-area v-bind="getFieldProps(item, 'description')"></text-area>
          </v-flex>
        </v-layout>
      </v-card-title>
    </v-card>
    <v-btn color="success" @click="addField">Add</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import DataTable from "@/components/DataTable.vue";
import TextField from "@/components/Inputs/TextField.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import DeleteButton from "@/components/SQRForm/DeleteButton.vue";
import Checkbox from "@/components/Inputs/Checkbox.vue";
import SoundIssuesMixin from "@/components/SQRForm/SoundIssuesMixin";
import SoundTypeRadioGroup from "@/components/SQRForm/SoundTypeRadioGroup.vue";
import _ from "lodash";

@Component({
  name: "SoundIssues",
  components: {
    DeleteButton,
    Checkbox,
    TextArea,
    SoundTypeRadioGroup,
    TextField,
    DataTable
  }
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
    actions: DeleteButton,
    type: SoundTypeRadioGroup,
    description: TextArea,
    entireFile: Checkbox
  };

  styles = {
    beginning: this.hideField,
    ending: this.hideField,
    entireFile: {
      entireFile: true
    }
  };

  hideField(value: any, item: any) {
    const field = _.get(
      this.form,
      `${this.updatePath}.${item}.entireFile`,
      false
    );
    return {
      hidden: field,
      timeField: true
    };
  }

  getFieldProps(item, value) {
    return {
      ...this.customData[value].props,
      item,
      value
    };
  }

  get customData() {
    return {
      ...this.componentData,
      entireFile: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            class: "entireFile",
            label: "Entire file"
          }
        }
      },
      type: {
        ...this.componentData.type,
        props: {
          ...this.componentData.type.props,
          fields: [
            "Background noise",
            { label: "Low/changing volume", value: "Volume" },
            "Reverberation",
            { label: "Other...", value: "other" }
          ]
        }
      }
    };
  }

  get items() {
    return Object.keys(this.form.soundIssues);
  }

  get mappedHeaders(): any[] {
    return [
      { text: "Entire file", value: "entireFile", width: "10%" },
      ...this.headers
    ].map((header: any) => ({ ...header, sortable: false }));
  }
}
</script>

<style>
.hidden {
  opacity: 0;
}
</style>
