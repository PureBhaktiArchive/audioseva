<template>
  <div>
    <p class="font-weight-bold mb-0">{{ item[".key"] }}</p>
    <ul>
      <li
        v-for="(unwantedPart, key, index) in item.unwantedParts"
        :key="index"
      >{{ `${formatSeconds(unwantedPart.beginning)}&#8211;${formatSeconds(unwantedPart.ending)},
        ${unwantedPart.type}, ${unwantedPart.description || ""}` }}
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
ul {
  list-style-type: none;
}
li:before {
  content: "- ";
}
</style>
