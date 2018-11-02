<template>
  <div>
    <v-data-table :headers="headers" :items="filesByLanguage">
      <template slot="items" slot-scope="{ item }">
        <td>{{ item.filename }}</td>
        <td>{{ item.status }}</td>
        <td>{{ item.languages.join(", ")}}</td>
      </template>
    </v-data-table>
    <v-data-table :headers="headers" :items="files">
      <template slot="items" slot-scope="{ item }">
        <td>{{ item.filename }}</td>
        <td>{{ item.status }}</td>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import fb from "@/firebaseApp";
import { ISQRFile } from "../types/SQRDataTable";

@Component({
  name: "SQRFileStatistics"
})
export default class SQRFileStatistics extends Vue {
  lists: { [key: string]: { [key: string]: ISQRFile } };
  files: ISQRFile[] = [];
  doneFiles = null;
  headers = [
    { text: "File name", value: "filename" },
    { text: "Status", value: "status" },
    { text: "Languages", value: "languages" }
  ];

  mounted() {
    this.fetchLists();
  }

  fetchLists() {
    const date = new Date();
    this.$bindAsObject(
      "lists",
      fb.database().ref("sqr/files"),
      null,
      this.extractFiles
    );
    this.$bindAsArray(
      "doneFiles",
      fb
        .database()
        .ref("sqr/submissions")
        .orderByChild("completed")
        .startAt(date.setDate(date.getDate() - 5))
    );
  }

  extractFiles() {
    const files = [];
    let listKey;
    for (listKey in this.lists) {
      if (listKey !== ".key") {
        for (let filename in this.lists[listKey]) {
          files.push({ ...this.lists[listKey][filename], filename });
        }
      }
    }
    this.files = files;
  }

  get filesByLanguage() {
    return this.files.filter(file => file.status === "Spare");
  }
}
</script>

<style scoped>
</style>
