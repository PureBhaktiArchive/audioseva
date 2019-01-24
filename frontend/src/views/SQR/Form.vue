<template>
  <div>
    <v-container>
      <h2>Sound Quality Report for {{ $route.params.fileName }}</h2>
    </v-container>
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container>
        <v-layout wrap>
          <template v-for="(label, index) in cancelFields" >
            <v-flex xs12 :key="label" v-if="cancel === null || cancel === index + 1">
              <v-list>
                <v-list-group class="overflow" :style="{ border: cancelColors[index].border }" @click="handleListClick(index + 1)" :value="cancel === index + 1" no-action>
                  <v-list-tile :style="cancelColors[index]" slot="activator">
                    <v-list-tile-content>
                      <v-list-tile-title :style="{ height: 'auto' }">
                        {{ label }}
                      </v-list-tile-title>
                    </v-list-tile-content>
                  </v-list-tile>
                  <div :style="{ border: cancelColors[index].border }" class="pa-1">
                    <v-checkbox
                      class="pa-2"
                      v-model="cancelCheck[index + 1]"
                      :label="label"
                      :rules="rules"
                    >
                    </v-checkbox>
                    <v-textarea class="pa-2" :rules="rules" v-model="cancelComments[index + 1]" box>
                    </v-textarea>
                    <v-btn type="submit">Confirm</v-btn>
                  </div>
                </v-list-group>
              </v-list>
            </v-flex>
          </template>
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
            <v-btn type="submit">Submit</v-btn>
          </template>
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
  cancelCheck = {};
  cancelColors = {
    0: {
      backgroundColor: "#fcf8e3",
      color: "#8a6d3b",
      border: "solid .2rem #faebcc"
    },
    1: {
      backgroundColor: "#d9edf7",
      color: "#31708f",
      border: "solid .2rem #bce8f1"
    }
  };
  form = {
    unwantedParts: {
      [_.uniqueId("unwantedParts_")]: {}
    },
    soundIssues: {
      [_.uniqueId("soundIssues_")]: {}
    }
  };

  rules = [v => !!v || "Required field"];

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
>>> .v-list__group__header--active {
  overflow: auto;
}
.overflow {
  overflow: auto;
}

@media only screen and (min-width: 660px) {
  .overflow {
    overflow: hidden;
  }
}
</style>
