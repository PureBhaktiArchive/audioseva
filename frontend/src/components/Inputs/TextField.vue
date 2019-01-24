<template>
  <v-text-field :value="getValue()" v-bind="fieldProps" @input="handleInput"></v-text-field>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import ItemPath from "@/mixins/ItemPath";

@Component({
  name: "TextField"
})
export default class TextField extends Mixins<ItemPath>(ItemPath) {
  @Prop({ default: () => ({}) })
  fieldProps!: any;
  @Prop() form!: any;

  handleInput(value: string) {
    this.updateForm(this.itemPath, value);
  }
}
</script>

<style scoped>
</style>
