<template>
  <div>
    <v-layout wrap>
      <v-flex xs12 md3>
        <v-text-field
          v-model="search"
          append-icon="fa-search"
          label="Filter tasks"
          single-line
          hide-details
        ></v-text-field>
      </v-flex>
      <v-flex class="ml-3" xs12 md4 align-self-end>
        <v-btn-toggle v-model="selectedButton" mandatory>
          <v-btn v-for="(value, key, index) in statuses" :key="index">{{ value }}</v-btn>
        </v-btn-toggle>
      </v-flex>
    </v-layout>
    <data-table
      :headers="headers"
      :items="items"
      :computedValue="computedCb"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :tableRowStyle="tableRowStyle"
      :styles="styles"
    >

    </data-table>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import _ from "lodash";
import DataTable from "@/components/DataTable.vue";
import { getListId, formatTimestamp, getDaysPassed } from "@/utility";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import firebase from "firebase/app";
import "firebase/database";

@Component({
  name: "Tasks",
  components: {
    DataTable,
    Feedback,
    InlineAssignEdit,
    InlineStatusEdit,
    InlineTextEdit,
    UnwantedParts
  }
})
export default class Tasks extends Mixins<InlineSave>(InlineSave) {
  headers = [
    { text: "Task ID", value: ".key" },
    { text: "Status", value: "trackEditing.status" },
    { text: "Assignee", value: "assignee" },
    { text: "Date Given", value: "trackEditing.givenTimestamp" },
    { text: "Days Passed", value: "daysPassed" },
    { text: "Date Done", value: "trackEditing.doneTimestamp" },
    { text: "Languages", value: "languages" },
    { text: "Task Definition", value: "taskDefinition" },
    { text: "Unwanted Parts", value: "trackEditing.unwantedParts" },
    { text: "Output", value: "output" },
    { text: "Feedback", value: "feedback" },
    { text: "Follow Up", value: "trackEditing.followUp" }
  ];

  selectedButton = 0;
  search = "";
  statuses = ["All", "Spare", "Given", "Submitted", "Revise", "Done"];

  lists: any[] = [];

  itemsKey: string = "lists";

  editEvents = {
    cancel: this.cancel,
    save: this.save
  };

  styles = {
    ".key": {
      "font-weight-bold": true,
      "text-no-wrap": true
    }
  };

  computedComponent = {
    "trackEditing.followUp": InlineTextEdit,
    "trackEditing.unwantedParts": UnwantedParts,
    feedback: Feedback,
    output: Output,
    assignee: InlineAssignEdit
  };

  computedCb = {
    daysPassed: getDaysPassed("trackEditing.givenTimestamp"),
    "trackEditing.givenTimestamp": formatTimestamp,
    "trackEditing.doneTimestamp": formatTimestamp,
    languages: (value, item) => {
      const languages = _.get(item, "trackEditing.chunks", []).reduce(
        (languageList: any, chunk: any) => [
          ...languageList,
          ..._.get(chunk, "contentReport.languages", [])
        ],
        []
      );
      return _.union(languages).join(", ");
    }
  } as { [key: string]: (value: any, item: any) => any };

  componentData = {
    "trackEditing.followUp": {
      on: { ...this.editEvents }
    },
    "trackEditing.unwantedParts": {
      props: {
        soundIssuesKey: "unwantedParts"
      }
    },
    output: {
      on: { ...this.editEvents, multiSave: this.multiFieldSave }
    },
    assignee: {
      on: { ...this.editEvents },
      props: {
        keyPath: "trackEditing",
        cancelData: this.assigneeCancel
      }
    }
  };

  mounted() {
    this.getLists();
  }

  tableRowStyle(item: any) {
    let backgroundColor = "none";
    switch (item.trackEditing.status) {
      case "Spare":
        backgroundColor = "none";
        break;
      case "Given":
        backgroundColor = "#D9E9FF";
        break;
      case "Submitted":
        backgroundColor = "#f5f5dc";
        break;
      case "Revise":
        backgroundColor = "#FFFFD5";
        break;
      case "Done":
        backgroundColor = "#C0D890";
        break;
    }
    return {
      backgroundColor
    };
  }

  assigneeCancel() {
    return {
      status: "",
      givenTimestamp: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
  }

  getLists() {
    this.$bindAsArray("lists", firebase.database().ref("/edited"), null, () => {
      this.lists = this.lists.reduce((lists, list) => {
        return [...lists, ...this.mapTasks(list)];
      }, []);
    });
  }

  mapTasks(list: any) {
    return Object.entries(list).reduce(
      (items: any, [listItemKey, listItemValue]) => {
        if (listItemKey !== ".key") {
          items.push({ [".key"]: listItemKey, ...listItemValue });
        }
        return items;
      },
      []
    );
  }

  getUpdatePath(item: any, path: any): string {
    return `/edited/${getListId(item[".key"])}/${item[".key"]}/${
      path.itemPath
    }`;
  }

  get searchValue() {
    return this.search.toLowerCase();
  }

  searchChunks(chunks) {
    return chunks.some(chunk => this.fieldHasSearchValue(chunk, "fileName"));
  }

  fieldHasSearchValue(item, path) {
    const searchValue = _.get(item, path, "") as string;
    return searchValue.toLowerCase().includes(this.searchValue);
  }

  searchFields(item: any) {
    let matchedItem = false;
    if (
      item[".key"].toLowerCase().includes(this.searchValue) ||
      this.fieldHasSearchValue(item, "trackEditing.followUp") ||
      this.fieldHasSearchValue(item, "trackEditing.assignee.name") ||
      this.fieldHasSearchValue(item, "trackEditing.feedback") ||
      this.searchChunks(_.get(item, "trackEditing.chunks", []))
    ) {
      matchedItem = true;
    }
    return matchedItem;
  }

  get items() {
    return this.lists.filter((task: any) => {
      let hasStatus = false;
      let matchesSearch = false;
      if (this.selectedStatus === "All") {
        hasStatus = true;
      } else {
        hasStatus = this.selectedStatus === task.trackEditing.status;
      }
      if (!this.searchValue) {
        matchesSearch = true;
      } else {
        matchesSearch = this.searchFields(task);
      }
      return matchesSearch && hasStatus;
    });
  }

  get selectedStatus() {
    return this.statuses[this.selectedButton];
  }
}
</script>

<style scoped>
</style>
