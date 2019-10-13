<template>
  <p class="ma-0 text-no-wrap" v-if="item.assignee">
    <span>{{item.assignee.name}}</span>
    <br>
    <span
      :style="{ fontSize: 'smaller',color: '#A9A9A9' }"
    >{{item.assignee.emailAddress}}</span>
  </p>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "Assignee"
})
export default class Assignee extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;
}
</script>

<style scoped>
</style>
