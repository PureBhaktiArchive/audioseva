/*
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <h1>Sound Quality Reporting</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">

      <v-autocomplete
        v-model="allotment.assignee"
        :hint="allotment.assignee ? `Languages: ${allotment.assignee.languages.join(', ')}`: ''"
        :items="assignees || []"
        :loading="assignees === null && !errors.getAssignees"
        item-text="name"
        item-value="id"
        label="Select an assignee"
        :error-messages="errors.getAssignees ? `Error getting assignees: ${errors.getAssignees}` : ''"
        persistent-hint
        return-object
        clearable
        dense
      >
        <template slot="item" slot-scope="{item}">
          <template v-if="typeof item !== 'object'">
            <v-list-tile-content v-text="item"></v-list-tile-content>
          </template>
          <template v-else>
            <v-list-tile-content>
              <v-list-tile-title v-html="item.name"></v-list-tile-title>
              <v-list-tile-sub-title v-html="item.emailAddress"></v-list-tile-sub-title>
            </v-list-tile-content>
          </template>
        </template>
      </v-autocomplete>
      <!-- Language -->
      <v-layout row class="py-2">
        <v-btn-toggle v-model="filter.languages" multiple>
          <v-btn flat v-for="language in languages" :key="language" :value="language">{{language}}</v-btn>
        </v-btn-toggle>
      </v-layout>
      <!-- List -->
      <v-layout row class="py-2">
        <div class="red--text" v-if="errors.getLists">Error getting lists: {{ errors.getLists }}</div>
        <v-btn-toggle v-model="filter.list" v-else-if="lists">
          <v-btn flat v-for="list in lists" :key="list" :value="list">{{list}}</v-btn>
        </v-btn-toggle>
        <p v-else>Loading lists…</p>
      </v-layout>
      <!-- Files -->
      <div class="red--text" v-if="errors.getSpareFiles">Error getting files: {{ errors.getSpareFiles }}</div>
      <template v-else-if="filter.list && filter.languages.length">
        <template v-if="files">
          <template v-if="files.length > 0">
            <template v-for="(file, index) in files">
              <div :key="file.name">
                <v-divider v-if="index > 0 && files[index - 1].date !== file.date"/>
                <v-layout align-center>
                  <v-checkbox
                    :style="{ flex: 'none' }"
                    v-model="allotment.files"
                    :value="file"
                    :loading="!files"
                    class="mr-2"
                  >
                    <code slot="label">{{ file.name }}</code>
                  </v-checkbox>
                  <span>{{ file.date || "No date" }} {{ file.language || "No language" }} {{ file.notes }}</span>
                </v-layout>
              </div>
            </template>
          </template>
          <p v-else>No spare files found for selected language in {{filter.list}} list.</p>
        </template>
        <p v-else>Loading files…</p>
      </template>
      <p v-else-if="!errors.getLists">Choose list and language to select files.</p>
      <!-- Comment -->
      <v-textarea v-model="allotment.comment" box label="Comment" rows="3"></v-textarea>
      <!-- Buttons -->
      <div>
        <v-btn @click="allot" :loading="submissionStatus === 'inProgress'">Allot</v-btn>
        <p
          v-if="errors.processAllotment"
          class="mb-0 d-inline red--text"
        >
          Error submitting allotment: {{ errors.processAllotment }}
        </p>
      </div>
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

<script>
import firebase from "firebase/app";
import "firebase/functions";
import * as _ from "lodash";

import { initialAllotment } from "../utility";
import CRAllotment from "@/views/CRAllotment.vue";
import ErrorMessages from "../mixins/ErrorMessages";

export default {
  mixins: [ErrorMessages],
  name: "SQRAllotment",
  data: () => ({
    assignees: null,
    languages: ["English", "Hindi", "Bengali", "None"],
    lists: null,
    files: null,
    filter: {
      languages: [],
      list: null
    },
    allotment: {
      assignee: null,
      files: [],
      comment: null
    },
    submissionStatus: null
  }),
  mounted: function() {
    // Getting assignees
    firebase
      .functions()
      .httpsCallable("User-getAssignees")({
        phase: "SQR"
      })
      .then(result => {
        this.assignees = result.data;
        if (this.$route.query.emailAddress) {
          this.allotment.assignee = this.assignees.find(
            assignee => assignee.emailAddress === this.$route.query.emailAddress
          );
        }
      })
      .catch(this.addErrorMessage("getAssignees"));

    // Getting lists
    firebase
      .functions()
      .httpsCallable("SQR-getLists")()
      .then(result => {
        this.lists = result.data;
      })
      .catch(this.addErrorMessage("getLists"));

    this.filter.languages = this.languages;
  },
  watch: {
    "allotment.assignee": function(newValue) {
      if (newValue == null) return;

      this.filter.languages = this.languages;
    },
    filter: {
      deep: true,
      handler: _.debounce(async function() {
        this.files = null;
        this.allotment.files = [];
        if (this.filter.list == null) return;

        const result = await firebase
          .functions()
          .httpsCallable("SQR-getSpareFiles")(this.filter)
          .catch(this.addErrorMessage("getSpareFiles"));
        if (!result) return;
        this.files = result.data;
      }, 1000)
    }
  },
  methods: {
    async allot() {
      this.submissionStatus = "inProgress";
      try {
        await firebase.functions().httpsCallable("SQR-processAllotment")(
          this.allotment
        );
        this.errors = {};
        this.submissionStatus = "complete";
      } catch (error) {
        this.addErrorMessage("processAllotment")(error);
        // alert(error.message);
        this.submissionStatus = "error";
      }
    },
    reset() {
      this.filter = CRAllotment.initialFilter();
      this.allotment = initialAllotment();
      this.submissionStatus = null;
    }
  }
};
</script>
