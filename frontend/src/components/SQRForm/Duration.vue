<template>
  <v-layout wrap>
    <v-flex xs6 class="pa-1" v-for="field in fields" :key="field">
      <v-text-field
        placeholder="Enter the timing in (h:)mm:ss format"
        :label="field"
        @input="handleInput(field.toLowerCase(), $event)"
      ></v-text-field>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import FormField from "@/mixins/FormField";

@Component({
  name: "Duration"
})
export default class Duration extends Mixins<FormField>(FormField) {
  fields = ["Beginning", "Ending"];

  handleInput(field, value) {
    this.updateForm(`duration.${field}`, value);
  }
}
</script>

<style scoped>
</style>
