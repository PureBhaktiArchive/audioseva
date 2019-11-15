<template>
  <div>
    <v-card class="my-3" v-for="(item, index) in items" :key="form.unwantedParts[item].id">
      <v-card-title>
        <v-row class="justify-xl-evenly" justify="space-between">

          <v-col align-self="center" cols="12" class="d-flex justify-space-between pb-2" lg="12">
            <v-col cols="7" sm="5">
              <h3>Unwanted part #{{ index + 1}}</h3>
            </v-col>
            <v-col :style="{ display: 'flex', justifyContent: 'flex-end' }" cols="5">
              <delete-button v-bind="getFieldProps('actions', item)" />
            </v-col>
          </v-col>

          <v-col class="pb-3" cols="12">
            <v-divider></v-divider>
          </v-col>

          <v-col
            class="d-flex justify-space-between pa-0"
            :style="{ flexWrap: 'wrap', flexDirection: 'row', height: '50%' }"
            cols="12"
            sm="6"
            md="3"
            xl="2"
          >
            <v-col
              class="d-flex justify-space-between pa-0"
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
      Unwanted Part
    </v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import TextField from "@/components/Inputs/TextField.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import DeleteButton from "@/components/SQRForm/DeleteButton.vue";
import SoundIssuesMixin from "@/components/SQRForm/SoundIssuesMixin";
import SoundTypeRadioGroup from "@/components/SQRForm/SoundTypeRadioGroup.vue";

@Component({
  name: "UnwantedParts",
  components: {
    TextField,
    TextArea,
    DeleteButton,
    SoundTypeRadioGroup
  }
})
export default class UnwantedParts extends Mixins<SoundIssuesMixin>(
  SoundIssuesMixin
) {
  updatePath = "unwantedParts";

  formProps = {
    updateForm: this.updateForm,
    updatePath: this.updatePath
  };

  get customData(): any {
    return {
      ...this.componentData,
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
    return Object.keys(this.form.unwantedParts || {});
  }
}
</script>

<style scoped>
</style>
