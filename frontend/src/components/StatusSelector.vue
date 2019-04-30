<template>
  <v-btn-toggle @change="handleChange" :value="value" v-bind="btnToggleOptions">
    <v-btn v-for="(status, key, index) in statuses" :key="index" v-bind="btnProps">{{ status }}</v-btn>
  </v-btn-toggle>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "StatusSelector"
})
export default class StatusSelector extends Vue {
  @Prop() value!: any;
  @Prop({ default: () => ({}) })
  btnToggleProps!: any;
  @Prop({ default: () => ({}) })
  btnProps!: any;
  @Prop({
    default: () => ["All", "Spare", "Given", "Submitted", "Revise", "Done"]
  })
  statuses!: any[];

  handleChange(value: number) {
    this.$emit("input", value);
  }

  get btnToggleOptions() {
    return {
      mandatory: true,
      style: {
        flexWrap: "wrap"
      },
      ...this.btnToggleProps
    };
  }
}
</script>

<style scoped>
</style>
