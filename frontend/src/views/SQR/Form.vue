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
              <v-list class="cancel-list">
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
                    <v-textarea outline class="pa-2" :rules="rules" v-model="cancelComments[index + 1]" box>
                    </v-textarea>
                    <v-btn type="submit">Confirm</v-btn>
                  </div>
                </v-list-group>
              </v-list>
            </v-flex>
          </template>
          <template v-if="!isCancelChecked && Object.keys(form).length">
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
              <v-expansion-panel>
                <v-expansion-panel-content>
                  <div :style="{ flex: '0' }" class="pr-2" slot="header">Guidelines</div>
                  <v-card>
                    <v-card-text v-html="field.guidelines">
                    </v-card-text>
                  </v-card>
                </v-expansion-panel-content>
              </v-expansion-panel>
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
      component: "SQRField",
      guidelines: `Please rate the overall sound quality of the allotted file by selecting one of the options:
      Good, Average, Bad. The basis of rating will be the audibility of Srila Gurudeva’s voice. In other words,
      if you find it difficult or strenuous to understand what Srila Gurudeva is speaking, due to too much background
      noise or volume being too low and so on, please choose ‘Bad’. On the other hand, if the audio is clear, with no
       background noise and good volume, please choose ‘Good.’ In cases where you can hear Srila Gurudeva well but
       there is some sound issue also, choose ‘Average’. This will help us decide which SE to allot the file to.`
    },
    {
      title: "C. Unwanted parts to be cut",
      component: "UnwantedParts",
      guidelines: `
      For each unwanted part you identify, please fill details in one such block Please note:
       The timing is to be filled in (h:)mm:ss format. Also, please mention the Beginning and Ending time for
       each such unwanted part. For e.g. If from 20 minutes and 10 seconds to 21 minutes and 20 seconds there is
       an abrupt blank space, please write 20:10 in the ‘Beginning field’ and 21:20 in the Ending field. Choose
       ‘Blank Space’ in Type and provide a relevant details in the Description field. For the next unwanted part,
       please add another such block.

       <ul>
        <li>
          Add block by clicking on the green button ‘Add’. You can also choose to add more than one such blocks by
          entering a number in the field next to the ‘Add’ button.
        </li>
        <li>
          Alternatively, you can also add another such block by clicking on the green ‘+’ button on the right and
          delete one block by clicking on the red ‘-’ button on the right.
         </li>
       </ul>
       `
    },
    {
      title: "D. Sound issues",
      component: "SoundIssues",
      guidelines: `
      For every issue you wish to report for the SE’s attention, please fill this part as follows.

      <ul>
        <li>
          Enter the Beginning and Ending timing of the section in (h:)mm:ss format. Choose the specific issue from
          the options listed or enter a different issue by selecting ‘Other’. Please describe the issue in the
          ‘Description’ field.
        </li>
        <li>
          For instance, from 20:20 - 21:34 if there is loud noise of roadside vehicles, making it difficult to hear
          what Srila Gurudeva is speaking, then please write ‘20:20’ in the Beginning field and ‘21:34’ in the Ending
          field. Choose the option ‘Background noise’ in Type and in ‘Description’ field, write ‘Sound of vehicles
          honking and general traffic noise.’
        </li>
        <li>
          To add another comment for the SE, add another such block by clicking on the green button ‘Add’.
          You can also choose to add more than one such blocks by entering a number in the field
          next to the ‘Add’ button.
        </li>
        <li>
          Alternatively, you can also add another such block by clicking on the green ‘+’ button on the right
          and delete one block by clicking on the red ‘-’ button on the right.
        </li>
      </ul>
      `
    },
    {
      title: "E. Total Duration of the Recording",
      component: "Duration",
      guidelines:
        "Here, we simply want to know how much the tape has relevant recording. " +
        "In other words, whether any part of the sound file is blank or inaudible and hence to be discarded. " +
        "Usually such parts are present towards the end of the file. There might be small parts 5-7 min long " +
        "in between two lecture recordings, but these can be ignored. Please write the beginning and ending timings" +
        " of the overall recording in this field in (h:)mm:ss format."
    },
    {
      title: "F. Comments",
      component: "TextArea",
      guidelines: `
        <ul>
          <li>
           Is there any issue with the overall sound quality? E.g. Background hum throughout, vehicle sound throughout
           the tape, sound of the fan or wind, low volume, etc. Please provide these details here.
          </li>
          <li>
            Any other comments you wish to provide can be filled here.
          </li>
         </ul>
      `,
      props: {
        pathOverride: "comments",
        fieldProps: {
          box: true,
          outline: true,
          required: true
        }
      }
    }
  ];
  cancelFields = [
    "I'm unable to play or download the audio",
    "The alloted lecture is not in my preferred language"
  ];
  cancel: number | null = null;
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
  form: any = {};
  guidelines: any = {};

  rules = [(v: any) => !!v || "Required field"];

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
    } else {
      this.form = {
        unwantedParts: [{}],
        soundIssues: [{}]
      };
    }
  }

  async submitDraft() {
    await this.submitForm();
  }

  async submitForm(complete = false) {
    if ((this.$refs as any).form.validate()) {
      const { created, changed, ...form } = this.form;
      const data: any = {
        ...form,
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

  get isCancelChecked() {
    return Object.values(this.cancelCheck).includes(true);
  }
}
</script>

<style scoped>
>>> .v-list__group__header--active {
  overflow: auto;
}

>>> .cancel-list .v-list__group__header__append-icon {
  display: none;
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
