<template>
  <radio-group :fieldProps="fieldProps" :form="form" :fields="ratings" updatePath="soundQualityRating" :updateForm="updateForm"></radio-group>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import RadioGroup from "@/components/Inputs/RadioGroup.vue";
import { required } from "@/validation";

@Component({
  name: "SQRField",
  components: { RadioGroup }
})
export default class SQRField extends Vue {
  ratings = [
    {
      label:
        "<b>Good</b> - You can hear Srila Gurudeva clearly with very little or no disturbance",
      value: "Good"
    },
    {
      label:
        "<b>Average</b> - Srila Gurudeva can be heard clearly but there are background noises or the volumn is low",
      value: "Average"
    },
    {
      label:
        "<b>Bad</b> - You can hear Srila Gurudeva but need to strain because of either very low volume, or too much background noise, constant distractions, etc",
      value: "Bad"
    },
    {
      label:
        "<b>Entire file is Inaudible</b> - You can make out that there is some recording but cannot hear anything clearly",
      value: "Inaudible"
    },
    {
      label:
        "<b>Entire file is Blank</b> - There is no sound at all or just irrelevant sound (like someone forgot to stop recording)",
      value: "Blank"
    }
  ];
  @Prop() form!: any;
  @Prop() updateForm!: any;
  fieldProps = {
    rules: [required]
  };
}
</script>

<style scoped>
</style>
