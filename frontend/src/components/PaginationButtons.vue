<template>
  <div>
    <v-btn @click="handlePrevious" :disabled="page === 1 || isLoading">Previous</v-btn>
    <v-btn @click="next" :disabled="lastPage || isLoading">Next</v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "PaginationButtons"
})
export default class PaginationButtons extends Vue {
  @Prop() next!: () => void;
  @Prop() previous!: () => void;
  @Prop() isLoading!: boolean;
  @Prop() lastPage!: boolean;
  @Prop() page!: number;
  @Prop() firstPage!: () => void;

  handlePrevious() {
    if (this.page - 1 === 1) {
      this.firstPage();
    } else {
      this.previous();
    }
  }
}
</script>

<style scoped>
</style>
