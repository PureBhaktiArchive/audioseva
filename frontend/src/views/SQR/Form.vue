<template>
  <div>
    <v-container>
      <h2>Sound Quality Report for {{ $route.params.fileName }}</h2>
    </v-container>
    <div v-if="isLoadingForm" class="d-flex justify-center">
      <v-progress-circular indeterminate />
    </div>
    <v-container v-else-if="cancelComplete">
      <p>Allotment is canceled!</p>
    </v-container>
    <v-container v-else-if="submitSuccess">
      <div class="submitSuccessBackground">
        <p class="pa-4 title submitSuccessText">Thank you! We have received your submission.</p>
      </div>
    </v-container>
    <v-form v-else-if="canSubmit" ref="form" @submit.prevent="handleSubmit">
      <v-container>
        <v-layout wrap>
          <template v-for="(item, index) in cancelFields" >
            <v-flex xs12 :key="item.label">
              <v-list class="cancel-list">
                <v-list-group @click="handleListClick(index + 1)" :value="cancel === index + 1" no-action>
                  <v-list-tile :style="item.styles" slot="activator">
                    <v-list-tile-content>
                      <v-list-tile-title :style="{ height: 'auto' }">
                        {{ item.header }}
                      </v-list-tile-title>
                    </v-list-tile-content>
                  </v-list-tile>
                  <div v-if="cancel !== null" :style="{ border: item.styles.border }" class="pa-1">
                    <v-checkbox
                      class="pa-2"
                      v-model="cancelCheck[index + 1]"
                      :label="item.label"
                    >
                    </v-checkbox>
                    <div v-if="cancelCheck[index + 1]">
                      <v-textarea
                        :placeholder="item.placeholder"
                        label="Comment"
                        outline
                        class="pa-2"
                        :rules="rules"
                        v-model="cancelComment"
                        box
                      >
                      </v-textarea>
                      <v-btn type="submit">Confirm</v-btn>
                    </div>
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
            <v-flex class="my-2" :style="{ backgroundColor: '#fff' }" xs12 v-for="(field, index) of fields" :key="index">
              <h3>{{ field.title }}</h3>
              <template v-if="field.component">
                <component
                  v-bind="field.props"
                  :form="form"
                  :removeField="removeField"
                  :updateForm="field.updateForm || updateForm"
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
            <v-layout class="sticky" wrap>
              <v-flex xs12 sm6>
                <v-btn v-if="!form.completed" @click="submitDraft">Save draft</v-btn>
                <v-btn type="submit" color="primary">Submit</v-btn>
              </v-flex>
              <v-flex align-self-center sm6 md6>
                <p :style="{margin: '6px 0 6px 8px', color: formStateMessageColor }">
                  {{ formStateMessages[draftStatus] }}
                </p>
              </v-flex>
            </v-layout>
          </template>
        </v-layout>
      </v-container>
    </v-form>
    <p class="d-flex justify-center red--text font-weight-bold" v-else>
      This allotment is not valid, please contact coordinator.
    </p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import moment from "moment";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";
import SQRField from "@/components/SQRForm/SQRField.vue";
import UnwantedParts from "@/components/SQRForm/UnwantedParts.vue";
import SoundIssues from "@/components/SQRForm/SoundIssues.vue";
import Duration from "@/components/SQRForm/Duration.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import {
  updateObject,
  getListId,
  removeObjectKey,
  getPathAndKey
} from "@/utility";

enum FormState {
  SAVING = 0,
  UNSAVED_CHANGES = 1,
  INITIAL_LOAD = 2,
  SAVED = 3,
  ERROR = 4
}

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
      Good, Average, Bad, Entire file is Inaudible, Entire file is Blank. The basis of rating will be the audibility of Srila Gurudeva’s voice. In other words,
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
          Add block by clicking on the green button ‘+ UNWANTED PART’.
        </li>
        <li>
          Delete one block by clicking on the red button on the right.
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
          To add another comment for the SE, add another such block by clicking on the green button ‘+ SOUND ISSUE’.
        </li>
        <li>
          Delete one block by clicking on the red button on the right.
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
    {
      header: "CLICK HERE if you are unable to play or download the audio",
      label: "I'm unable to play or download the audio",
      placeholder:
        "Please describe the problem here, we will allot you new lectures shortly",
      reason: "unable to play",
      styles: {
        backgroundColor: "#fcf8e3",
        color: "#8a6d3b",
        border: "solid .2rem #faebcc",
        whiteSpace: "none",
        width: "100%"
      }
    },
    {
      header:
        "CLICK HERE if the allotted lecture is not in your preferred language",
      label: "The alloted lecture is not in my preferred language",
      placeholder:
        "Please let us know which language it is in here, we will allot you new lectures shortly.",
      reason: "not in my preferred language",
      styles: {
        backgroundColor: "#d9edf7",
        color: "#31708f",
        border: "solid .2rem #bce8f1",
        whiteSpace: "none",
        width: "100%"
      }
    }
  ];
  cancel: number | null = null;
  cancelComment = "";
  cancelCheck = {};
  form: { [key: string]: any } = {};
  guidelines: any = {};
  isLoadingForm = true;
  canSubmit = false;
  cancelComplete = false;
  formStateMessages = {
    [FormState.SAVING]: "Saving...",
    [FormState.UNSAVED_CHANGES]: "Unsaved changes",
    [FormState.INITIAL_LOAD]: "",
    [FormState.SAVED]: "All changes saved",
    [FormState.ERROR]: ""
  };
  formStateMessagesColor: { [key: string]: string } = {
    [FormState.UNSAVED_CHANGES]: "red",
    [FormState.ERROR]: "red"
  };
  draftStatus = FormState.INITIAL_LOAD;
  initialData!: {
    [key: string]: any;
    created?: number;
    changed?: number;
    completed?: number;
    unwantedParts?: any;
    soundIssues?: any;
  };
  submitSuccess = false;

  rules = [(v: any) => !!v || "Required field"];

  handleListClick(cancelField: number) {
    this.cancelCheck = {};
    this.cancelComment = "";
    this.cancel = this.cancel === cancelField ? null : cancelField;
  }

  updateForm(field: string, value: any, debounceSubmit = true) {
    updateObject(this.form, { ...getPathAndKey(field), value });

    if (debounceSubmit) {
      if (_.isEqual(_.get(this.initialData, field), _.get(this.form, field))) {
        this.draftStatus = FormState.SAVED;
        if (!this.form.completed) {
          this.debounceSubmitDraft.cancel();
        }
      } else if (this.form.completed) {
        this.draftStatus = FormState.UNSAVED_CHANGES;
      } else {
        this.draftStatus = FormState.SAVING;
        this.debounceSubmitDraft();
      }
    }
  }

  async canSubmitForm() {
    const {
      params: { fileName, token }
    } = this.$route;
    const listId = getListId(fileName);
    const response = (await firebase
      .database()
      .ref(`original/${listId}/${fileName}`)
      .orderByChild("token")
      .equalTo(token)
      .once("value")).val();
    const sqrStatus = _.get(response, "soundQualityReporting.status", "");
    if (!sqrStatus || (sqrStatus as string).toLowerCase() === "done") {
      this.isLoadingForm = false;
    } else {
      this.canSubmit = true;
    }
  }

  async removeField(field: string) {
    removeObjectKey(this.form, getPathAndKey(field));

    if (_.isEqual(_.get(this.initialData, field), _.get(this.form, field))) {
      this.draftStatus = FormState.INITIAL_LOAD;
    }

    const [updateFieldPath] = field.split(".");
    await firebase
      .database()
      .ref(`${this.submissionPath()}/${updateFieldPath}`)
      .set(this.form[updateFieldPath]);
  }

  async handleSubmit() {
    this.cancelAutoSave();
    if (this.cancel) {
      await this.cancelForm();
    } else {
      await this.submitForm(true);
    }
  }

  async mounted() {
    await this.canSubmitForm();
    this.getSavedData();
    window.onbeforeunload = () => {
      if (this.draftStatus === FormState.UNSAVED_CHANGES) {
        return "Changes are not saved!";
      }
      return;
    };
  }

  getSavedData() {
    this.$bindAsObject(
      "initialData",
      firebase.database().ref(this.submissionPath()),
      null,
      this.populateForm
    );
  }

  populateForm() {
    this.isLoadingForm = false;
    const defaultData = {
      unwantedParts: [{}],
      soundIssues: [{}]
    };
    if (this.initialData[".value"] !== null) {
      const { [".key"]: token, ...initialData } = this.initialData;
      if (initialData.changed) {
        this.formStateMessages[
          FormState.INITIAL_LOAD
        ] = `Last edit was at ${moment(initialData.changed).format(
          "MM/DD/YYYY, h:mm a"
        )}`;
      }
      this.form = {
        ...(initialData.unwantedParts || initialData.soundIssues
          ? {}
          : defaultData),
        ...initialData
      };
    } else {
      this.form = defaultData;
    }
    this.initialData = _.cloneDeep(this.form);
  }

  async cancelForm() {
    if ((this.$refs as any).form.validate()) {
      const {
        params: { fileName, token }
      } = this.$route;
      await firebase
        .functions()
        .httpsCallable("SQR-cancelAllotment")({
          fileName,
          token,
          comments: this.cancelComment,
          // cancel is a number greater than 0 or null
          reason: this.cancelFields[(this.cancel || 1) - 1].reason
        })
        .catch(() => {
          this.canSubmit = false;
        });
      this.cancelComplete = true;
    }
  }

  async submitDraft() {
    this.cancelAutoSave();
    await this.submitForm();
  }

  debounceSubmitDraft: any = _.debounce(async () => {
    if (this.form.completed) return;
    await this.submitForm();
  }, 3000);

  cancelAutoSave() {
    this.debounceSubmitDraft.cancel();
  }

  async submitForm(save = false) {
    if (!save) {
      this.draftStatus = FormState.SAVING;
    }
    if (!save || (this.$refs as any).form.validate()) {
      if (save) {
        this.cancelAutoSave();
        this.draftStatus = FormState.SAVING;
      }
      const { created, changed, completed, ...form } = this.form;
      const data: any = {
        ...form,
        changed: firebase.database.ServerValue.TIMESTAMP
      };
      if (save && !completed) {
        data.completed = firebase.database.ServerValue.TIMESTAMP;
      }
      if (this.initialData[".value"] === null) {
        data.created = firebase.database.ServerValue.TIMESTAMP;
      }
      const updated = await firebase
        .database()
        .ref(this.submissionPath())
        .update(data)
        .catch(() => "error");

      if (updated === "error") {
        this.draftStatus = FormState.ERROR;
        this.formStateMessages[FormState.ERROR] = "Permission denied";
        return;
      }

      this.draftStatus = FormState.SAVED;

      if (save) {
        this.submitSuccess = true;
        if (!completed) {
          const response = (await firebase
            .database()
            .ref(`${this.submissionPath()}/completed`)
            .once("value")).val();
          if (response) this.$set(this.form, "completed", response);
        }
      }
      this.initialData = _.cloneDeep(this.form);
    }
  }

  submissionPath() {
    const {
      params: { fileName, token }
    } = this.$route;
    const listId = getListId(fileName);
    return `/submissions/soundQualityReporting/${listId}/${fileName}/${token}`;
  }

  get formStateMessageColor() {
    const color = this.formStateMessagesColor[this.draftStatus];
    return color ? color : "#000";
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

>>> .v-expansion-panel__header {
  padding: 0;
}

>>> .v-card .v-input {
  padding-top: 0;
  margin-top: 0;
}

/* { width: '100%', backgroundColor: 'rgba(79, 240, 86, 0.12)', border: 'solid 2px #86bf8629', borderRadius: '6px' } */

.submitSuccessBackground {
  background-color: rgba(79, 240, 86, 0.12);
  border: solid 2px #86bf8629;
  border-radius: 6px;
  width: 100%;
}

.submitSuccessText {
  color: #087308;
  text-align: center;
}

.cancel-list {
  padding: 0;
}

>>> .cancel-list .v-list__group__header__append-icon {
  display: none;
}

>>> .v-expansion-panel {
  box-shadow: none;
}

.overflow {
  overflow: auto;
}

.sticky {
  background-color: #fafafa;
  bottom: 0;
  padding: 12px;
  position: sticky;
  width: 100%;
}

@media screen and (min-width: 1904px) {
  >>> .justify-xl-evenly {
    justify-content: space-evenly;
  }
}

@media only screen and (min-width: 660px) {
  .overflow {
    overflow: hidden;
  }
}
</style>
