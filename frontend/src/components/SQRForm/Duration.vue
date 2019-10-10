<template>
  <v-layout wrap>
    <v-flex xs6 class="pa-1" v-for="field in fields" :key="field">
      <time-field
        outline
        placeholder="(h:)mm:ss"
        :label="field"
        @input="handleInput(field.toLowerCase(), $event)"
        :value="getFormData(field.toLowerCase())"
        :rules="rules()"
      >
      </time-field>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import FormField from "@/mixins/FormField";
import { required, validateDuration } from "@/validation";
import TimeField from "@/components/SQRForm/TimeField.vue";

@Component({
  name: "Duration",
  components: { TimeField }
})
export default class Duration extends Mixins<FormField>(FormField) {
  fields = ["Beginning", "Ending"];

  handleInput(field: any, value: any) {
    this.updateForm(`duration.${field}`, value);
  }

  getFormData(field: any) {
    return _.get(this.form, `duration.${field}`);
  }

  rules() {
    return ["Good", "Bad", "Average"].includes(this.form.soundQualityRating)
      ? [required, validateDuration]
      : [validateDuration];
  }
}
</script>

<style scoped>
</style>
