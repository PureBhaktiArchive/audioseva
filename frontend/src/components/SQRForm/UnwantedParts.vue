<template>
  <div>
    <template v-for="(item, index) in items">
      <v-card class="my-3" v-if="form.unwantedParts[item]" :key="index">
        <v-card-title>
          <v-layout class="justify-xl-evenly" justify-space-between wrap>

            <v-flex align-self-center xs12 class="d-flex justify-space-between justify-xl-evenly pb-2" lg12>
              <v-flex xs5>
                <h3>Unwanted part #{{ index + 1}}</h3>
              </v-flex>
              <v-flex :style="{ display: 'flex', justifyContent: 'flex-end' }" xs5>
                <delete-button v-bind="getFieldProps('actions', item)" />
              </v-flex>
            </v-flex>

            <v-flex class="pb-3" xs12>
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
              <v-flex
                class="d-flex justify-space-between"
                :style="{ flexWrap: 'wrap' }"
                xs12>
                <v-flex class="pr-1" xs6 md12>
                  <text-field v-bind="getFieldProps('beginning', item)"></text-field>
                </v-flex>
                <v-flex class="pl-1" xs6 md12>
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
    </template>
    <v-btn color="success" @click="addField">
      <v-icon small left v-text="`$vuetify.icons.plus`" />
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
