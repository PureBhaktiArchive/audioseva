<template>
  <div>
    <v-card class="my-3" v-for="(item, index) in items" :key="index">
      <v-card-title>
        <v-layout class="justify-xl-evenly" justify-space-between wrap>

          <v-flex align-self-center xs12 class="d-flex justify-space-between justify-xl-evenly pb-2" lg12>
            <v-flex xs5>
              <h3>Sound issue #{{ index + 1}}</h3>
            </v-flex>
            <v-flex :style="{ display: 'flex', justifyContent: 'flex-end' }" xs5>
              <delete-button v-bind="getFieldProps('actions', item)" />
            </v-flex>
          </v-flex>

          <v-flex xs12>
            <v-divider></v-divider>
          </v-flex>

          <v-flex
            align-self-center
            class="d-flex justify-space-between"
            :style="{ flexWrap: 'wrap', flexDirection: 'row' }"
            xs12
            sm6
            md3
            xl2
          >
            <v-flex xs12 md12 lg12>
              <checkbox v-bind="getFieldProps('entireFile', item)"></checkbox>
            </v-flex>
            <v-flex
              :class="hideField('beginning', item)"
              class="d-flex justify-space-between"
              :style="{ flexWrap: 'wrap' }"
              xs12>
              <v-flex xs6 md12>
                <text-field v-bind="getFieldProps('beginning', item)"></text-field>
              </v-flex>
              <v-flex xs6 md12>
                <text-field v-bind="getFieldProps('ending', item)"></text-field>
              </v-flex>
            </v-flex>
          </v-flex>

          <v-flex align-self-center xs12 sm5 md3 xl2>
            <sound-type-radio-group v-bind="getFieldProps('type', item)"></sound-type-radio-group>
          </v-flex>

          <v-flex align-self-center xs12 md5 lg4 xl4>
            <text-area v-bind="getFieldProps('description', item)"></text-area>
          </v-flex>
        </v-layout>
      </v-card-title>
    </v-card>
    <v-btn color="success" @click="addField">
      <v-icon small left v-text="`$vuetify.icons.plus`" />
      Sound Issues
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
    const field = _.get(
      this.form,
      `${this.updatePath}.${item}.entireFile`,
      false
    );
    return {
      hidden: field
    };
  }

  getFieldProps(value: string, item: any) {
    return {
      ...this.customData[value].props,
      item,
      value
    };
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
  display: none !important;
}
</style>
