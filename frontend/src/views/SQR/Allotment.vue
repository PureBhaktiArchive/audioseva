/* * sri sri guru gauranga jayatah */
<template>
  <div>
    <h1>Sound Quality Reporting Allotment</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        :items="users || []"
        :hint="usersHint"
        :loading="users === null"
        item-text="name"
        label="Select a devotee"
        persistent-hint
        return-object
        clearable
        dense
      >
        <template slot="item" slot-scope="{ item }">
          <template v-if="typeof item !== 'object'">
            <v-list-tile-content v-text="item"></v-list-tile-content>
          </template>
          <template v-else>
            <v-list-tile-content>
              <v-list-tile-title v-html="item.name"></v-list-tile-title>
              <v-list-tile-sub-title
                v-html="item.emailAddress"
              ></v-list-tile-sub-title>
            </v-list-tile-content>
          </template>
        </template>
      </v-autocomplete>
      <!-- Language -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.language">
          <v-btn
            flat
            v-for="language in languages"
            :key="language"
            :value="language"
            >{{ language }}</v-btn
          >
        </v-btn-toggle>
      </v-layout>
      <!-- List -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.list" v-if="lists && lists.length">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{
            list
          }}</v-btn>
        </v-btn-toggle>
        <p v-else-if="lists == null">Loading lists…</p>
        <p v-else-if="lists.length == 0">There is no spare file.</p>
      </v-layout>
      <!-- Files -->
      <template v-if="filter.list && filter.language">
        <template v-if="files">
          <template v-if="files.length > 0">
            <v-layout align-center v-for="file in files" :key="file.filename">
              <v-checkbox
                v-model="allotment.files"
                :value="file.filename"
                :loading="!files"
              >
                <code slot="label">{{ file.filename }}</code>
              </v-checkbox>
              <span>{{ file.notes }}</span>
            </v-layout>
          </template>
          <p v-else>
            No spare files found for selected language in
            {{ filter.list }} list.
          </p>
        </template>
        <p v-else>Loading files…</p>
      </template>
      <p v-else>Choose list and language to select files.</p>
      <!-- Comment -->
      <v-textarea
        v-model="allotment.comment"
        box
        label="Comment"
        rows="3"
      ></v-textarea>
      <!-- Buttons -->
      <v-btn @click="allot" :loading="submissionStatus === 'inProgress'"
        >Allot</v-btn
      >
    </v-form>
    <v-alert
      v-else
      :value="submissionStatus === 'complete'"
      type="success"
      transition="scale-transition"
    >
      <h4 class="alert-heading">Allotted succesfully</h4>
      <p class="mb-0">
        <v-btn @click="reset">Make another allotment</v-btn>
      </p>
    </v-alert>
  </div>
</template>

<style>
#files pre {
  background-color: #f9f2f4;
  color: #c7254e;
}
</style>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import _ from "lodash";
import UsersByRole from "@/mixins/UsersByRole";
import ShallowQuery from "@/mixins/FirebaseShallowQuery";
import { initialAllotment, initialFilter } from "@/utility";
import { IFileVueFire } from "@/types/DataTable";

@Component({
  name: "Allotment"
})
export default class Allotment extends Mixins<UsersByRole, ShallowQuery>(
  UsersByRole,
  ShallowQuery
) {
  usersRole = "SQR";
  languages: string[] = ["English", "Hindi", "Bengali"];
  files: any = null;
  filter: any = initialFilter();
  allotment: any = initialAllotment();
  submissionStatus: any = null;
  sqrFiles: IFileVueFire[] = [];

  mounted() {
    this.getUsers();
    this.getLists();
  }

  get usersHint() {
    const languages = _.get(this.allotment, "assignee.languages", {});
    const hint = Object.keys(languages).join(", ");
    return hint ? `Languages: ${hint}` : "";
  }

  @Watch("allotment.assignee")
  handleAssignee(newValue: any) {
    if (newValue == null) return;
    for (let language of this.languages) {
      if (newValue.languages[language]) {
        this.filter.language = language;
      }
    }
  }

  @Watch("filter", { deep: true })
  handleFilter() {
    this.files = null;
    this.allotment.files = [];

    if (this.filter.list == null) return;

    this.$bindAsArray(
      "sqrFiles",
      firebase
        .database()
        .ref(`original/${this.filter.list}`)
        .orderByChild("soundQualityReporting/status")
        .equalTo("Spare"),
      null, // cancel callback not used
      this.filterSelectedFiles
    );
  }

  filterSelectedFiles() {
    if (this.sqrFiles.length) {
      this.files = this.sqrFiles.reduce(
        (
          filteredItems: any[],
          {
            languages,
            soundQualityReporting: { notes } = { notes: "" },
            ...other
          }
        ) => {
          if (languages && languages.includes(this.filter.language)) {
            filteredItems.push({
              languages,
              notes,
              filename: other[".key"]
            });
          }
          return filteredItems;
        },
        []
      );
    }
  }

  async allot() {
    const {
      assignee: { name, emailAddress },
      ...other
    } = this.allotment;

    this.submissionStatus = "inProgress";
    const allotmentData = {
      ...other,
      assignee: {
        name,
        emailAddress
      },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: (firebase as any).auth().currentUser.email
    };

    // TODO: save allotment via callable function

    this.submissionStatus = "complete";
  }

  reset() {
    this.allotment = initialAllotment();
    this.filter = initialFilter();
    this.submissionStatus = null;
  }
}
</script>
