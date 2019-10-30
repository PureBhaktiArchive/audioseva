<template>
  <div class="pagination-controls">
    <v-select
      class="mt-0 pt-0"
      hide-details
      :style="{ width: '60px', flex: 'none' }"
      :items="[50, 100, 200]"
      @change="handlePageSizeChange"
      :value="value"
    >
    </v-select>
    <v-btn :disabled="pagination.page === 1" @click="handlePreviousPage"
      >Previous</v-btn
    >
    <v-btn
      class="mr-0"
      :disabled="pagination.page === lastPageNumber"
      @click="handleNextPage"
      >Next</v-btn
    >
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "PaginationControls"
})
export default class PaginationControls extends Vue {
  @Prop() pagination!: { [key: string]: any };
  @Prop() lastPageNumber!: number;
  @Prop() value!: number;

  handlePageSizeChange(e: any) {
    this.$emit("input", e);
  }
  handlePreviousPage(e: any) {
    this.$emit("previousPage", e);
  }
  handleNextPage(e: any) {
    this.$emit("nextPage", e);
  }
}
</script>

<style scoped>
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

@media screen and (min-width: 415px) {
  .pagination-controls {
    justify-content: flex-end;
  }
}
</style>
