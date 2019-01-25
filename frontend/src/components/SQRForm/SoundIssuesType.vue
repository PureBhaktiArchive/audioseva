<template>
  <radio-group :form="form" :fieldProps="fieldProps" :fields="issues" :updatePath="itemPath" :updateForm="updateForm"></radio-group>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import RadioGroup from "@/components/Inputs/RadioGroup.vue";
import ItemPath from "@/mixins/ItemPath";

@Component({
  name: "SoundIssuesType",
  components: { RadioGroup }
})
export default class SoundIssuesType extends Mixins<ItemPath>(ItemPath) {
  @Prop() fieldProps!: any;
  issues = [
    "Background noise",
    { label: "Low/changing volume", value: "Volume" },
    "Reverberation",
    { label: "Other...", value: "other" }
  ];
}
</script>

<style scoped>
</style>
