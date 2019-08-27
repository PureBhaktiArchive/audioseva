<template>
  <router-link :to="`/te/tasks/${item['.key']}`">{{ item['.key'] }}</router-link>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "Link"
})
export default class Link extends Vue {
  @Prop() item!: any;
  @Prop() value!: any;
}
</script>

<style scoped>
</style>
