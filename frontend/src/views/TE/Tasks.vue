<template>
  <data-table
    :headers="headers"
    :items="items"
    :computedValue="computedCb"
    :computedComponent="computedComponent"
    :componentData="componentData"
  >

  </data-table>
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

  timestamps = {
    "trackEditing/feedback": true
  };

  lists: any[] = [];

  itemsKey: string = "lists";

  editEvents = {
    cancel: this.cancel,
    save: this.save
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
}
</script>

<style scoped>
</style>
