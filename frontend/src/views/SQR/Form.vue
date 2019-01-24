<template>
  <div>
    <v-container>
      <h2>Sound Quality Report for {{ $route.params.fileName }}</h2>
    </v-container>
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container>
        <v-layout wrap>
          <v-flex xs6 v-for="(label, index) in cancelFields" :key="label">
            <v-list>
              <v-list-group @click="handleListClick(index + 1)" :value="cancel === index + 1" no-action>
                <v-list-tile slot="activator">
                  <v-list-tile-content>
                    <v-list-tile-title :style="{ height: 'auto' }">
                      <v-checkbox
                        :checked="cancel === index + 1"
                        :value="cancel === index + 1"
                        :label="label"
                      >
                      </v-checkbox>
                    </v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
                <div class="pa-1">
                  <v-textarea v-model="cancelComments[index + 1]" box>
                  </v-textarea>
                  <v-btn>Cancel</v-btn>
                </div>
              </v-list-group>
            </v-list>
          </v-flex>
          <template v-if="!cancel">
            <v-flex xs12>
              <h3>A. Audio File Name</h3>
              <v-text-field disabled :value="$route.params.fileName">
              </v-text-field>
            </v-flex>
            <v-flex xs12 v-for="(field, index) of fields" :key="index">
              <h3>{{ field.title }}</h3>
              <template v-if="field.component">
                <component
                  v-bind="field.props"
                  :form="form"
                  :removeField="removeField"
                  :updateForm="updateForm"
                  :is="field.component"
                ></component>
              </template>
            </v-flex>
          </template>
          <v-btn type="submit">Submit</v-btn>
        </v-layout>
      </v-container>
    </v-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import SQRField from "@/components/SQRForm/SQRField.vue";
import UnwantedParts from "@/components/SQRForm/UnwantedParts.vue";
import SoundIssues from "@/components/SQRForm/SoundIssues.vue";
import Duration from "@/components/SQRForm/Duration.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import { updateObject } from "@/utility";

@Component({
  name: "Form",
  components: { SQRField, UnwantedParts, SoundIssues, Duration, TextArea }
})
export default class Form extends Vue {
  fields = [
    {
      title: "B. Sound Quality Rating",
      component: "SQRField"
    },
    {
      title: "C. Unwanted parts to be cut",
      component: "UnwantedParts"
    },
    {
      title: "D. Sound issues",
      component: "SoundIssues"
    },
    {
      title: "E. Total Duration of the Recording",
      component: "Duration"
    },
    {
      title: "F. Comments",
      component: "TextArea",
      props: {
        pathOverride: "comments",
        fieldProps: {
          box: true,
          required: true
        }
      }
    }
  ];
  cancelFields = [
    "I'm unable to play or download the audio",
    "The alloted lecture is not in my preferred language"
  ];
  cancel = null;
  cancelComments = {};
  form = {
    unwantedParts: {
      [_.uniqueId("unwantedParts_")]: {}
    },
    soundIssues: {
      [_.uniqueId("soundIssues_")]: {}
    }
  };

  handleListClick(cancelField: number) {
    this.cancel = this.cancel === cancelField ? null : cancelField;
  }

  updateForm(field: string, value: any) {
    const newForm = { ...this.form };
    this.form = updateObject(newForm, field, value);
  }

  removeField(field: string) {
    const newForm = { ...this.form };
    const paths = field.split(".");
    paths.reduce((form: any, path: string) => {
      if (path === paths[paths.length - 1]) {
        return delete form[path];
      }
      return (form[path] = { ...(form[path] ? form[path] : {}) });
    }, newForm);
    this.form = newForm;
  }

  handleSubmit() {}
}
</script>

<style scoped>
</style>
