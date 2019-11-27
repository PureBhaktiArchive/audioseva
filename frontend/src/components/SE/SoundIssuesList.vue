<template>
  <ul>
    <li
      :style="{ whiteSpace: 'nowrap' }"
      v-for="(value, key, index) in item.soundIssues"
      :key="index"
    >
      {{
        `${formatSeconds(value.beginning)}-${formatSeconds(value.ending)} ${
          value.type
        }, ${value.description || ""}`
      }}
    </li>
  </ul>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment from "moment";

@Component({
  name: "SoundIssuesList"
})
export default class SoundIssuesList extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;

  formatSeconds(seconds: number) {
    return moment
      .utc(moment.duration(seconds, "seconds").asMilliseconds())
      .format("mm:ss");
  }
}
</script>

<style scoped></style>
