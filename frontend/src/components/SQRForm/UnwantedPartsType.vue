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
  issues = [
    { label: "Blank space", value: "blank space" },
    { label: "Glitch", value: "glitch" },
    { label: "Irrelevant part", value: "irrelevant" },
    { label: "Other...", value: "other" }
  ];
}
</script>

<style scoped>
</style>
