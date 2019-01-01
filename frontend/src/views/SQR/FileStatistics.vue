<template>
  <div>
    <header>
      <h1>Sound Quality Reporting Statistics</h1>
    </header>
    <files-by-status
      :isLoading="isLoadingFiles"
      :countByStatus="fileCountByStatus"
      :items="filesByStatus"
    >
    </files-by-status>
    <done-statistics :doneStatistics="doneStatistics"></done-statistics>
    <spare-by-language :spareByLanguage="spareByLanguage"></spare-by-language>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import fb from "@/firebaseApp";
import {
  IFileVueFire,
  ISpareByLanguage,
  IFileByStatus,
  ICount
} from "@/types/DataTable";
import FilesByStatus from "@/components/SQRStatistics/FilesByStatus.vue";
import DoneStatistics from "@/components/SQRStatistics/DoneStatistics.vue";
import SpareByLanguage from "@/components/SQRStatistics/SpareByLanguage.vue";

@Component({
  name: "FileStatistics",
  components: { DoneStatistics, FilesByStatus, SpareByLanguage }
})
export default class FileStatistics extends Vue {
  lists!: { [key: string]: { [key: string]: IFileVueFire } };
  isLoadingFiles: boolean = false;
  doneFiles: any = null;
  doneStatistics: ICount = {};
  filesByStatus: IFileByStatus[] = [];
  spareByLanguage: ISpareByLanguage = {};
  fileCountByStatus: ICount = {};
  headers = [
    { text: "File name", value: "filename" },
    { text: "Status", value: "status" },
    { text: "Languages", value: "languages" }
  ];

  mounted() {
    this.fetchLists();
  }

  fetchLists() {
    this.isLoadingFiles = true;
    const date = new Date();
    this.$bindAsObject(
      "lists",
      fb.database().ref("files"),
      null,
      this.extractFiles
    );
    this.$bindAsArray(
      "doneFiles",
      fb
        .database()
        .ref("sqr/submissions")
        .orderByChild("completed")
        .startAt(date.setDate(date.getDate() - 5)),
      null,
      this.doneFileStatistics
    );
  }

  doneFileStatistics() {
    const doneStatistics = {};
    _.forEach(this.doneFiles, file => {
      const date = this.getDate(new Date(file.completed));
      _.set(doneStatistics, date, _.get(doneStatistics, date, 0) + 1);
    });
    this.doneStatistics = doneStatistics;
  }

  getDate(date: Date) {
    const today = new Date();
    const dateString = date.toDateString().split(" ");
    return today.toDateString() === date.toDateString()
      ? "today"
      : `${dateString[1]} ${dateString[2]}`;
  }

  extractFiles() {
    const statusByList = {};
    const spareByLanguage = {};
    const fileCountByStatus = {};
    _.forIn(this.lists, (list, listName) => {
      if (listName !== ".key") {
        const listStatusTotal = `${listName}.GRAND`;
        // file count by list
        _.set(statusByList, listStatusTotal, Object.keys(list).length);

        _.forIn(
          list,
          ({
            soundQualityReporting: { status } = { status: "Spare" },
            languages
          }) => {
            const listStatus = `${listName}.${status}`;

            // spare files by language
            if (status === "Spare") {
              _.forEach(languages, (language: string) => {
                _.set(
                  spareByLanguage,
                  language,
                  _.get(spareByLanguage, language, 0) + 1
                );
              });
            }
            // total file count per status, used in footer for GRAND
            _.set(
              fileCountByStatus,
              status,
              _.get(fileCountByStatus, status as string, 0) + 1
            );
            // total file count
            _.set(
              fileCountByStatus,
              "GRAND",
              _.get(fileCountByStatus, "GRAND", 0) + 1
            );
            // file count per list per status
            _.set(
              statusByList,
              listStatus,
              _.get(statusByList, listStatus, 0) + 1
            );
          }
        );
      }
    });
    this.fileCountByStatus = fileCountByStatus;
    this.filesByStatus = Object.entries(statusByList).map(([list, stats]) => ({
      ...stats,
      list
    }));
    this.spareByLanguage = spareByLanguage;
    this.isLoadingFiles = false;
  }
}
</script>

<style scoped>
</style>
