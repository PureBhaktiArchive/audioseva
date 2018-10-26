<template>
  <div>
    <v-select placeholder="Select list" :items="lists" v-on:change="selectedList = $event"></v-select>
    <s-q-r-data-table :files="files"></s-q-r-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { db } from "@/main";
import SQRDataTable from "@/components/SQRDataTable.vue";

@Component({
  name: "SQRFiles",
  components: {
    SQRDataTable
  }
})
export default class SQRFiles extends Vue {
  lists: string[] = [];
  sqrFileLists: any[] = [];
  selectedList: string = "";
  files: any[] = [];

  mounted() {
    this.$bindAsArray("sqrFileLists", db.ref("sqr/files/"), null, () => {
      this.lists = this.sqrFileLists.map(item => {
        return item[".key"];
      });
    });
  }

  @Watch("selectedList")
  handleChange() {
    console.log(this.selectedList);
    this.$bindAsArray("files", db.ref(`sqr/files/${this.selectedList}`));
  }
}
</script>

<style scoped>
</style>
