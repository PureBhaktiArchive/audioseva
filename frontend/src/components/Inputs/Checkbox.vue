<template>
  <v-checkbox
    v-bind="fieldProps"
    :input-value="getValue()"
    @change="handleInput"
  ></v-checkbox>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import ItemPath from "@/mixins/ItemPath";

@Component({
  name: "Checkbox",
})
export default class Checkbox extends Mixins<ItemPath>(ItemPath) {
  @Prop({ default: () => ({}) })
  fieldProps!: any;

  handleInput(value: string) {
    this.updateForm(this.itemPath, value);
  }
}
</script>

<style scoped></style>
