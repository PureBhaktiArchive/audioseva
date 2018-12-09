<template>
  <div>
    <div :style="{ display: 'flex', justifyContent: 'center' }" v-if="isValidForm === null">
      <p><v-progress-circular indeterminate></v-progress-circular></p>
    </div>
    <div v-else-if="submissionComplete">
      <h3>Thank you! We have received your feedback</h3>
    </div>
    <v-form ref="form" v-else-if="isValidForm">
      <v-text-field
        :value="$route.params.taskId"
        disabled
        label="Task ID"
      >
      </v-text-field>
      <v-checkbox
        label="Approved"
        v-model="qcForm.approved"
        required
        @change="validateForm"
      >
      </v-checkbox>
      <v-select
        required
        v-model="qcForm.soundQualityRating"
        :items="['Good', 'Average', 'Bad']"
        :rules="[v => !!v || 'This field is required']"
        label="Select quality"
        v-if="qcForm.approved"
      >
      </v-select>
      <v-textarea
        ref="comments"
        v-model="qcForm.comments"
        :rules="commentRules"
        label="Comments"
        @blur="validateForm"
      >
      </v-textarea>
      <v-btn @click="submit">submit</v-btn>
    </v-form>
    <div v-else>
      <h3>Access error: Invalid token</h3>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import fb from "@/firebaseApp";

@Component({
  name: "QCSubmissionForm"
})
export default class QCSubmissionForm extends Vue {
  isValidForm: any = null;

  qcForm: any = {
    approved: false,
    soundQualityRating: null,
    comments: null
  };

  submissionComplete: boolean = false;

  commentRules = [
    () => {
      if (!this.qcForm.approved && !this.qcForm.comments) {
        return "Field required";
      }
      if (this.qcForm.approved) return true;
      return true;
    }
  ];

  async submit() {
    if (this.validateForm()) {
      const {
        params: { taskId }
      } = this.$route;
      await fb
        .database()
        .ref("sound-editing/restoration/quality-check/feedback")
        .push()
        .set({
          taskId,
          ...this.qcForm
        });
      this.submissionComplete = true;
    }
  }

  validateForm() {
    return (this.$refs.form as any).validate();
  }

  mounted() {
    this.verifyToken();
  }

  async verifyToken() {
    const {
      query: { token },
      params: { taskId }
    } = this.$route;
    if (!token) return (this.isValidForm = false);
    const listId = taskId.split("-")[0];
    const response = await fb
      .database()
      .ref(
        `sound-editing/tasks/${listId}/${taskId}/restoration/quality-check/token`
      )
      .once("value");
    this.isValidForm = token === response.val();
  }
}
</script>

<style scoped>
</style>
