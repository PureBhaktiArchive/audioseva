<template>
  <radio-group :form="form" :fieldProps="fieldProps" :updatePath="itemPath" :updateForm="updateForm" :fields="issues"></radio-group>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from "vue-property-decorator";
import RadioGroup from "@/components/Inputs/RadioGroup.vue";
import ItemPath from "@/mixins/ItemPath";

@Component({
  name: "UnwantedPartsType",
  components: { RadioGroup }
})
export default class UnwantedPartsType extends Mixins<ItemPath>(ItemPath) {
  @Prop() fieldProps!: any;
  issues = ["Blank space", "Glitch", "Irrelevant part", "Other..."];
}
</script>

<style scoped>
</style>
