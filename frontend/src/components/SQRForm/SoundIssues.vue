<template>
  <div>
    <v-card class="my-3" v-for="(item, index) in items" :key="index">
      <v-card-title>
        <v-row class="justify-xl-evenly" justify="space-between" >

          <v-col align-self="center" cols="12" class="d-flex justify-space-between pb-2" lg="12">
            <v-col cols="7" sm="5">
              <h3>Sound issue #{{ index + 1}}</h3>
            </v-col>
            <v-col :style="{ display: 'flex', justifyContent: 'flex-end' }" cols="5">
              <delete-button v-bind="getFieldProps('actions', item)" />
            </v-col>
          </v-col>

          <v-col cols="12" class="pb-3">
            <v-divider></v-divider>
          </v-col>

          <v-col
            class="d-flex justify-space-between"
            :style="{ flexWrap: 'wrap', flexDirection: 'row', height: '100%' }"
            cols="12"
            sm="6"
            md="3"
            xl="2"
          >
            <checkbox v-bind="getFieldProps('entireFile', item)"></checkbox>
            <v-col
              v-if="!hideField('beginning', item)"
              class="d-flex justify-space-between"
              :style="{ flexWrap: 'wrap' }"
              cols="12">
              <v-col class="pr-1" cols="6">
                <text-field v-bind="getFieldProps('beginning', item)"></text-field>
              </v-col>
              <v-col class="pl-1" cols="6">
                <text-field v-bind="getFieldProps('ending', item)"></text-field>
              </v-col>
            </v-col>
          </v-col>

          <v-col cols="12" sm="5" md="3" xl="2">
            <sound-type-radio-group v-bind="getFieldProps('type', item)"></sound-type-radio-group>
          </v-col>

          <v-col cols="12" md="5" lg="4" xl="4">
            <text-area v-bind="getFieldProps('description', item)"></text-area>
          </v-col>
        </v-row>
      </v-card-title>
    </v-card>
    <v-btn class="ma-0" color="success" @click="addField">
      Add
      Sound Issue
    </v-btn>
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

  hideField(value: any, item: any) {
    return _.get(this.form, `${this.updatePath}.${item}.entireFile`, false);
  }

  get customData(): any {
    return {
      ...this.componentData,
      entireFile: {
        props: {
          ...this.formProps,
          form: this.form,
          fieldProps: {
            label: "Entire file",
            hideDetails: true
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
    return Object.keys(this.form.soundIssues || {});
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
</style>
