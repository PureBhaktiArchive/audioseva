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
                  <div v-if="cancel !== null" :style="{ border: cancelColors[index].border }" class="pa-1">
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
            <v-btn type="submit" color="success">Submit</v-btn>
            <v-btn v-if="!form.complete" @click="submitDraft" color="secondary">Save draft</v-btn>
          </template>
        </v-layout>
      </v-container>
    </v-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase";
import SQRField from "@/components/SQRForm/SQRField.vue";
import UnwantedParts from "@/components/SQRForm/UnwantedParts.vue";
import SoundIssues from "@/components/SQRForm/SoundIssues.vue";
import Duration from "@/components/SQRForm/Duration.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import fb from "@/firebaseApp";
import { updateObject, getListId, removeObjectKey } from "@/utility";

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
  form: any = {
    unwantedParts: [{}],
    soundIssues: [{}]
  };

  rules = [v => !!v || "Required field"];

  handleListClick(cancelField: number) {
    this.cancel = this.cancel === cancelField ? null : cancelField;
  }

  updateForm(field: string, value: any) {
    this.form = updateObject(this.form, field, value);
  }

  removeField(field: string) {
    this.form = removeObjectKey(this.form, field);
  }

  async handleSubmit() {
    await this.submitForm(true);
  }

  mounted() {
    this.getSavedData();
  }

  getSavedData() {
    this.$bindAsObject(
      "initialData",
      fb.database().ref(this.submissionPath()),
      null,
      this.populateForm
    );
  }

  populateForm() {
    if (this.initialData[".value"] !== null) {
      const { [".key"]: token, ...initialData } = this.initialData;
      this.form = initialData;
    }
  }

  async submitDraft() {
    await this.submitForm();
  }

  async submitForm(complete = false) {
    if ((this.$refs as any).form.validate()) {
      const data: any = {
        ...this.form,
        changed: firebase.database.ServerValue.TIMESTAMP
      };
      if (complete) data.complete = firebase.database.ServerValue.TIMESTAMP;
      if (this.initialData[".value"] === null) {
        data.created = firebase.database.ServerValue.TIMESTAMP;
      }
      await fb
        .database()
        .ref(this.submissionPath())
        .update(data);
    }
  }

  submissionPath() {
    const {
      params: { fileName, token }
    } = this.$route;
    const listId = getListId(fileName);
    return `/submissions/soundQualityReporting/${listId}/${fileName}/${token}`;
  }
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
