<template>
  <div>
    <v-container>
      <h2>{{ $title }}</h2>
    </v-container>
    <div v-if="isLoadingForm" class="d-flex justify-center">
      <v-progress-circular indeterminate />
    </div>
    <v-container v-else-if="cancelComplete">
      <p>Allotment is canceled!</p>
    </v-container>
    <v-container v-else-if="submitSuccess">
      <div class="submitSuccessBackground">
        <p class="pa-4 title submitSuccessText">
          Thank you! We have received your submission.
        </p>
      </div>
    </v-container>
    <p
      class="d-flex justify-center red--text font-weight-bold"
      v-else-if="errorMessage"
    >
      {{ errorMessage }}
    </p>
    <v-form v-else ref="form" @submit.prevent="handleSubmit">
      <v-container>
        <v-row>
          <v-col>
            <v-list class="cancel-list">
              <cancel-list-item
                v-for="(cancelField, index) in cancelFields"
                :key="cancelField.label"
                @click="handleListClick(index + 1)"
                no-action
                class="py-1"
                v-bind="getCancelListProps(cancelFields[index])"
                :selected.sync="cancelCheck[index + 1]"
                v-model="cancelComment"
                :rules="rules"
              ></cancel-list-item>
            </v-list>
          </v-col>
          <template v-if="!isCancelChecked && Object.keys(form).length">
            <v-col cols="12">
              <h3>A. Audio File Name</h3>
              <v-text-field disabled :value="$route.params.fileName">
              </v-text-field>
            </v-col>
            <fields
              :form="form"
              :updateForm="debounceUpdateForm"
              :removeField="removeField"
            ></fields>
            <v-row class="sticky">
              <v-col
                cols="12"
                sm="6"
                :style="{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }"
              >
                <v-btn v-if="!isCompleted" @click="saveDraft">
                  Save draft
                </v-btn>
                <v-btn
                  v-if="$can('update', 'SQR/Form')"
                  type="submit"
                  color="primary"
                  class="mx-2"
                >
                  Submit
                </v-btn>
                <p
                  :style="{ color: 'red' }"
                  v-if="formHasError && showValidationSummary"
                  class="ma-0"
                >
                  Some fields are not filled properly, see above.
                </p>
              </v-col>
              <v-col align-self="center" sm="6" md="6">
                <p
                  :style="{
                    margin: '6px 0 6px 8px',
                    color: formStateMessageColor
                  }"
                >
                  {{ formStateMessages[formState] }}
                </p>
              </v-col>
            </v-row>
          </template>
        </v-row>
      </v-container>
    </v-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import { mapGetters } from "vuex";
import moment from "moment";
import "moment-timezone/builds/moment-timezone-with-data-10-year-range.min.js";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/functions";
import Fields from "@/components/SQRForm/Fields.vue";
import CancelListItem from "@/components/SQRForm/CancelListItem.vue";
import { updateObject, removeObjectKey, getPathAndKey } from "@/utility";
import { required } from "@/validation";

enum FormState {
  SAVING = 0,
  UNSAVED_CHANGES = 1,
  INITIAL_LOAD = 2,
  SAVED = 3,
  ERROR = 4,
  SUBMITTING = 5
}

enum SubmissionsBranch {
  COMPLETED = "completed",
  DRAFTS = "drafts",
  MIGRATED = "migrated"
}

@Component({
  name: "Form",
  components: { Fields, CancelListItem },
  computed: {
    ...mapGetters("user", ["hasRole"])
  },
  title: ({ $route }) => `Sound Quality Report for ${$route.params.fileName}`
})
export default class Form extends Vue {
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
  cancelComplete = false;
  formStateMessages = {
    [FormState.SAVING]: "Saving...",
    [FormState.SUBMITTING]: "Submitting...",
    [FormState.UNSAVED_CHANGES]: "Unsaved changes",
    [FormState.INITIAL_LOAD]: "",
    [FormState.SAVED]: "All changes saved",
    [FormState.ERROR]: "Permission denied"
  };
  formStateMessagesColor: { [key: string]: string } = {
    [FormState.UNSAVED_CHANGES]: "red",
    [FormState.ERROR]: "red"
  };
  formState = FormState.INITIAL_LOAD;
  initialData!: {
    [key: string]: any;
    created?: number;
    changed?: number;
    completed?: number;
    unwantedParts?: any;
    soundIssues?: any;
  };
  submitSuccess = false;
  formHasError = false;
  errorMessage = "";
  isCoordinator = false;
  showValidationSummary = false;
  hasRole!: any;
  rules = [required];
  destroyFormErrorWatch!: any;
  branch: SubmissionsBranch | null = null;

  handleListClick(cancelField: number) {
    this.cancelCheck = {};
    this.cancelComment = "";
    this.cancel = this.cancel === cancelField ? null : cancelField;
  }

  getCancelListProps({ reason, ...props }: { [key: string]: any }) {
    return props;
  }

  handleFormErrors() {
    this.destroyFormErrorWatch = this.$watch(
      () => (this.$refs.form as any).errorBag,
      (newFormErrors: { [key: string]: boolean }) => {
        this.formHasError = Object.values(newFormErrors).some(
          hasError => hasError
        );
        if (!this.formHasError) this.showValidationSummary = false;
      },
      { deep: true, immediate: true }
    );
  }

  updateForm(field: string, value: any, debounceSubmit = true) {
    updateObject(this.form, { ...getPathAndKey(field), value: value || null });

    if (!debounceSubmit) return;

    if (_.isEqual(this.initialData, this.form)) {
      this.formState = FormState.INITIAL_LOAD;
      if (!this.isCompleted) {
        this.debounceSaveDraft.cancel();
      }
    } else if (this.isCompleted) {
      this.formState = FormState.UNSAVED_CHANGES;
    } else {
      this.formState = FormState.SAVING;
      this.debounceSaveDraft();
    }
  }

  debounceUpdateForm = _.debounce(this.updateForm, 150);

  async validateAllotment() {
    const {
      params: { fileName, token }
    } = this.$route;
    const response = (
      await firebase
        .database()
        .ref(`SQR/allotments`)
        .orderByChild("token")
        .equalTo(token)
        .once("value")
    ).val();
    const allotmentStatus = _.get<string>(response, `${fileName}.status`, "");
    if (!allotmentStatus) {
      this.errorMessage =
        "This allotment is not valid, please contact coordinator.";
    } else if (
      !this.hasRole("SQR.coordinator") &&
      allotmentStatus.toLowerCase() === "done"
    ) {
      this.errorMessage =
        "This submission is finalized and cannot be updated, please contact the coordinator.";
    }
    if (this.errorMessage) this.isLoadingForm = false;
  }

  async removeField(field: string) {
    removeObjectKey(this.form, getPathAndKey(field));

    if (_.isEqual(this.initialData, this.form)) {
      this.formState = FormState.INITIAL_LOAD;
    } else if (this.isCompleted) {
      this.formState = FormState.UNSAVED_CHANGES;
      return;
    }

    const [updateFieldPath] = field.split(".");
    await firebase
      .database()
      .ref(
        `${this.submissionPath(SubmissionsBranch.DRAFTS)}/${updateFieldPath}`
      )
      .set(this.removeId(this.form[updateFieldPath]));
  }

  async handleSubmit() {
    this.cancelAutoSave();
    if (this.cancel) {
      await this.cancelForm();
    } else {
      await this.submitForm();
    }
  }

  async mounted() {
    await this.validateAllotment();
    if (!this.errorMessage) {
      this.getSavedData();
    }
    window.onbeforeunload = () => {
      if (this.formState === FormState.UNSAVED_CHANGES) {
        return "Changes are not saved!";
      }
      return;
    };
  }

  async getSavedData(branch: SubmissionsBranch = SubmissionsBranch.COMPLETED) {
    try {
      await this.$rtdbBind(
        "initialData",
        firebase.database().ref(this.submissionPath(branch))
      );
      if (
        this.initialData[".value"] !== null ||
        branch === SubmissionsBranch.DRAFTS
      ) {
        this.branch = branch;
        return this.populateForm();
      }

      if (branch === SubmissionsBranch.COMPLETED) {
        this.getSavedData(SubmissionsBranch.MIGRATED);
      } else if (branch === SubmissionsBranch.MIGRATED) {
        this.getSavedData(SubmissionsBranch.DRAFTS);
      }
    } catch (e) {
      this.isLoadingForm = false;
      this.errorMessage = "Error loading form data.";
    }
  }

  addId(soundIssuesOrUnwantedParts: Array<any>) {
    return soundIssuesOrUnwantedParts.map(part => ({
      id: _.uniqueId(),
      ...part
    }));
  }

  removeId(soundIssuesOrUnwantedParts: Array<any>) {
    return soundIssuesOrUnwantedParts.map(({ id, ...part }) => part);
  }

  populateForm() {
    this.isLoadingForm = false;
    const defaultData = {
      unwantedParts: this.addId([{}]),
      soundIssues: this.addId([{}])
    };
    if (this.initialData[".value"] !== null) {
      const { [".key"]: token, ...initialData } = this.initialData;
      if (initialData.changed || initialData.completed) {
        this.formStateMessages[FormState.INITIAL_LOAD] = `${
          initialData.completed ? "Form was submitted" : "Last edit was"
        } on ${(moment as any)
          .tz(
            initialData[initialData.completed ? "completed" : "changed"],
            (moment as any).tz.guess()
          )
          .format("MM/DD/YYYY [at] h:mm a")}`;
      }
      if (initialData.unwantedParts) {
        initialData.unwantedParts = this.addId(initialData.unwantedParts);
      }
      if (initialData.soundIssues) {
        initialData.soundIssues = this.addId(initialData.soundIssues);
      }
      this.form = {
        ...initialData,
        ...(initialData.unwantedParts || initialData.soundIssues
          ? {}
          : defaultData)
      };
    } else {
      this.form = defaultData;
    }
    this.initialData = _.cloneDeep(this.form);
    this.$nextTick(this.handleFormErrors);
  }

  async cancelForm() {
    if ((this.$refs as any).form.validate()) {
      const {
        params: { fileName, token }
      } = this.$route;
      let showSuccess = true;
      await firebase
        .functions()
        .httpsCallable("SQR-cancelAllotment")({
          fileName,
          token,
          comments: this.cancelComment,
          // cancel is a number greater than 0 or null
          reason: this.cancelFields[(this.cancel || 1) - 1].reason
        })
        .catch(e => {
          showSuccess = false;
          this.errorMessage = e.message || "Error cancelling form.";
        });
      if (!showSuccess) return;
      this.cancelComplete = true;
    }
  }

  async saveFormData(data: any, sqrSubmissionBranch: SubmissionsBranch) {
    const response = await firebase
      .database()
      .ref(this.submissionPath(sqrSubmissionBranch))
      .update(data)
      .catch(() => "error");
    if (response === "error") this.formState = FormState.ERROR;
    return response;
  }

  async saveDraft() {
    this.cancelAutoSave();
    const data = this.formData;
    this.formState = FormState.SAVING;
    const response = await this.saveFormData(data, SubmissionsBranch.DRAFTS);
    if (response !== "error") this.formState = FormState.SAVED;
    // check for first time created
    if (this.form.created) return;
    const newFormData = (
      await firebase
        .database()
        .ref(`${this.submissionPath(SubmissionsBranch.DRAFTS)}`)
        .once("value")
    ).val();
    if (newFormData.created) {
      this.$set(this.form, "created", newFormData.created);
    }
  }

  async submitForm() {
    if (!(this.$refs as any).form.validate()) {
      this.showValidationSummary = true;
      return;
    }
    this.cancelAutoSave();
    const data = this.formData;
    this.formState = FormState.SUBMITTING;
    data.completed =
      this.form.completed || firebase.database.ServerValue.TIMESTAMP;
    const response = await this.saveFormData(data, SubmissionsBranch.COMPLETED);
    if (response === "error") return;
    if (this.branch === SubmissionsBranch.DRAFTS) {
      firebase
        .database()
        .ref(this.submissionPath(this.branch))
        .remove();
    }
    this.destroyFormErrorWatch();
    this.submitSuccess = true;
  }

  debounceSaveDraft: any = _.debounce(async () => {
    if (this.isCompleted) return;
    await this.saveDraft();
  }, 3000);

  cancelAutoSave() {
    this.debounceSaveDraft.cancel();
  }

  submissionPath(branch: SubmissionsBranch = SubmissionsBranch.COMPLETED) {
    const {
      params: { fileName, token }
    } = this.$route;
    return `/SQR/submissions/${branch}/${fileName}/${token}`;
  }

  get formData() {
    const {
      created,
      changed,
      completed,
      soundIssues = [],
      unwantedParts = [],
      ...form
    } = this.form;
    const data: any = {
      ...form,
      soundIssues: this.removeId(soundIssues),
      unwantedParts: this.removeId(unwantedParts),
      changed: firebase.database.ServerValue.TIMESTAMP
    };
    data.created = created || firebase.database.ServerValue.TIMESTAMP;
    return data;
  }

  get formStateMessageColor() {
    const color = this.formStateMessagesColor[this.formState];
    return color ? color : "#000";
  }

  get isCancelChecked() {
    return Object.values(this.cancelCheck).includes(true);
  }

  get isCompleted() {
    return (
      this.branch === SubmissionsBranch.COMPLETED ||
      this.branch === SubmissionsBranch.MIGRATED
    );
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

>>> .v-expansion-panel-header__icon {
  margin-left: 8px;
}

>>> .cancel-list .v-list-group__header {
  padding-left: 0;
  padding-right: 0;
}

>>> .v-card .v-input {
  padding-top: 0;
  margin-top: 0;
}

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

>>> .cancel-list .v-list-group__header__append-icon {
  display: none;
}

>>> .v-expansion-panel:before {
  box-shadow: none;
}

.overflow {
  overflow: auto;
}

.sticky {
  background-color: #fafafa;
  bottom: 0;
  padding: 12px;
  position: relative;
  width: 100%;
  z-index: 4;
}

@media screen and (min-width: 1904px) {
  >>> .justify-xl-evenly {
    justify-content: space-evenly !important;
  }
}

@media only screen and (min-width: 900px) {
  .sticky {
    position: sticky;
  }
}

@media only screen and (min-width: 660px) {
  .overflow {
    overflow: hidden;
  }
}
</style>
