import { Component, Mixins, Watch } from "vue-property-decorator";

import _ from "lodash";
import firebase from "firebase/app";
import "firebase/database";

import { getDaysPassed, formatTimestamp } from "@/utility";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";
import Output from "@/components/TE/Output.vue";
import Feedback from "@/components/TE/Feedback.vue";
import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import InlineAssignEdit from "@/components/InlineAssignEdit.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineSave from "@/mixins/InlineSave";
import Paginator from "@/mixins/PaginatedQuery";

@Component
export default class TETasks extends Mixins<InlineSave, Paginator>(
  InlineSave,
  Paginator
) {
  selectedButton = 0;
  statuses = ["All", "Spare", "Given", "Submitted", "Revise", "Done"];

  assignee: any = null;

  itemsKey: string = "currentPageCollection";

  isLoading = true;

  filterFieldKey: { [key: string]: any } = {
    both: "trackEditing/_sort_assignee_status",
    email: "trackEditing/_sort_assignee",
    status: "trackEditing/_sort_status"
  };

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
    taskDefinition: TaskDefinition,
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

  get componentData() {
    return {
      "trackEditing.followUp": {
        on: { ...this.editEvents }
      },
      "trackEditing.unwantedParts": {
        props: {
          soundIssuesKey: "unwantedParts"
        }
      },
      output: {
        on: { ...this.editEvents, multiSave: this.multiFieldSave },
        props: {
          mode: this.mode
        }
      },
      assignee: {
        on: { ...this.editEvents },
        props: {
          keyPath: "trackEditing",
          cancelData: this.assigneeCancel,
          shouldCancelChange: (task: any) => task.trackEditing.status === "Done"
        }
      },
      taskDefinition: {
        class: {
          "task-definition": true
        }
      }
    };
  }

  get selectedStatus() {
    return this.statuses[this.selectedButton];
  }

  getUpdatePath(item: any, path: any): string {
    return `/edited/${item[".key"]}/${path.itemPath}`;
  }

  tableRowStyle(item: any) {
    let backgroundColor = "inherit";
    switch (item.trackEditing.status) {
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

  get items() {
    return this.currentPageCollection;
  }

  get datatableProps() {
    return { loading: this.isLoading };
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async nextPage() {
    this.isLoading = true;
    this.scrollTop();
    await this.next();
    this.isLoading = false;
  }

  previousPage() {
    this.isLoading = true;
    this.scrollTop();
    this.previous();
    this.isLoading = false;
  }

  async firstPage() {
    this.isLoading = true;
    this.scrollTop();
    await this.first();
    this.isLoading = false;
  }

  get queryField() {
    return this.filterFieldKey[this.filterFields] || "";
  }

  setQuery() {
    let baseQuery: firebase.database.Query = firebase.database().ref("/edited");
    if (this.queryField) {
      baseQuery = baseQuery.orderByChild(this.queryField);
    }
    this.baseQuery = baseQuery;
  }

  get queryText() {
    let text = "";
    switch (this.filterFields) {
      case "both":
        text = `${this.assignee.emailAddress}${this.selectedStatus}`;
        break;
      case "email":
        text = this.assignee.emailAddress;
        break;
      case "status":
        text = this.selectedStatus;
        break;
    }
    return text;
  }

  get filterFields() {
    let text = "";
    if (this.assignee && this.selectedButton) {
      text = `both`;
    } else if (this.assignee) {
      text = "email";
    } else if (this.selectedButton) {
      text = "status";
    }
    return text;
  }

  @Watch("selectedButton")
  async handleSelectedButton() {
    this.setQuery();
    await this.firstPage();
  }
}
