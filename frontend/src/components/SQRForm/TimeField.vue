<template>
  <v-text-field @input="onInput" v-model="innerValue" v-bind="$attrs"></v-text-field>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment from "moment";

@Component({
  name: "TimeField"
})
export default class TimeField extends Vue {
  @Prop() value!: number;
  momentDuration: any = {
    0: "seconds",
    1: "minutes",
    2: "hours"
  };

  innerValue: string = "";

  mounted() {
    if (this.value) {
      this.innerValue = moment("2015-01-01")
        .startOf("day")
        .seconds(this.value)
        .format("H:mm:ss");
    }
  }

  onInput(value: string) {
    const duration = value
      .split(/[:.]/)
      .reverse()
      .reduce(
        (momentFormat, timeString, index) => {
          momentFormat[this.momentDuration[index]] = timeString;
          return momentFormat;
        },
        {} as any
      );
    this.$emit("input", moment.duration(duration).asSeconds());
  }
}
</script>

<style scoped>
</style>
