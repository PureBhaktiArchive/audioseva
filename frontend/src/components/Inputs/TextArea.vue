<template>
  <v-textarea :value="getValue()" v-bind="fieldProps" @input="handleInput"></v-textarea>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import ItemPath from "@/mixins/ItemPath";

@Component({
  name: "TextArea"
})
export default class TextArea extends Mixins<ItemPath>(ItemPath) {
  @Prop({ default: () => ({}) })
  fieldProps!: any;
  @Prop() itemIndex!: any;

  handleInput(value: string) {
    this.updateForm(this.itemPath, value);
  }
}
</script>

<style scoped>
</style>
