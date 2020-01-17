<template>
  <p :style="{ color: 'red' }">
    File is older than the latest feedback on the task, please see it
    <router-link :to="taskLink">here</router-link>.
  </p>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "FileTimeError"
})
export default class FileTimeError extends Vue {
  @Prop() taskId!: string;

  get taskLink() {
    return `/te/tasks/${this.taskId}`;
  }
}
</script>

<style scoped></style>
