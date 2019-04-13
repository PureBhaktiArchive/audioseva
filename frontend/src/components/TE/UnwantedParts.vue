<template>
  <div>
    <p class="font-weight-bold mb-0 list-header">{{ item[".key"] }}</p>
    <ul>
      <li
        :style="{ whiteSpace: 'nowrap' }"
        v-for="(unwantedPart, key, index) in item.trackEditing.unwantedParts"
        :key="index"
      >{{ `${formatSeconds(unwantedPart.beginning)}-${formatSeconds(unwantedPart.ending)}:
        ${unwantedPart.type} - ${unwantedPart.description || ""}` }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import moment from "moment";

@Component({
  name: "UnwantedParts"
})
export default class UnwantedParts extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;

  formatSeconds(seconds: number) {
    return moment
      .utc(moment.duration(seconds, "seconds").asMilliseconds())
      .format("mm:ss");
  }
}
</script>

<style scoped>
.list-header {
  display: list-item;
  list-style-type: disc;
  list-style-position: inside;
}
</style>
