<template>
  <div>
    <h1>{{ $title }}</h1>
    <v-form @submit.stop.prevent v-if="submissionStatus != 'complete'">
      <v-autocomplete
        v-model="allotment.assignee"
        :hint="assigneeHint"
        :items="assignees || []"
        :loading="assignees === null && !errors.getAssignees"
        item-text="name"
        item-value="id"
        label="Select an assignee"
        :error-messages="
          errors.getAssignees
            ? `Error getting assignees: ${errors.getAssignees}`
            : ''
        "
        persistent-hint
        return-object
        clearable
        dense
      >
        <template slot="item" slot-scope="{ item }">
          <template v-if="typeof item !== 'object'">
            <v-list-item-content v-text="item"></v-list-item-content>
          </template>
          <template v-else>
            <v-list-item-content>
              <v-list-item-title v-html="item.name"></v-list-item-title>
              <v-list-item-subtitle
                v-html="item.emailAddress"
              ></v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </template>
      </v-autocomplete>
      <v-row class="py-2">
        <!-- Language -->
        <v-col cols="12">
          <v-btn-toggle v-model="filter.languages" multiple>
            <v-btn
              text
              v-for="language in languages"
              :key="language"
              :value="language"
              >{{ language }}</v-btn
            >
          </v-btn-toggle>
        </v-col>

        <!-- List -->
        <v-col>
          <div class="red--text" v-if="errors.getLists">
            Error getting lists: {{ errors.getLists }}
          </div>
          <v-btn-toggle v-model="filter.list" v-else-if="lists">
            <v-btn text v-for="list in lists" :key="list" :value="list">{{
              list
            }}</v-btn>
          </v-btn-toggle>
          <p v-else>Loading lists…</p>
        </v-col>
      </v-row>
      <!-- Files -->
      <div class="red--text" v-if="errors.getSpareFiles">
        Error getting files: {{ errors.getSpareFiles }}
      </div>
      <template v-else-if="filter.list && filter.languages.length">
        <template v-if="files">
          <template v-if="files.length > 0">
            <template v-for="(file, index) in files">
              <div :key="file.filename">
                <v-divider
                  v-if="index > 0 && files[index - 1].date !== file.date"
                />
                <v-row align="center">
                  <v-col>
                    <v-checkbox
                      :style="{ flex: 'none' }"
                      v-model="allotment.files"
                      :value="file"
                      :loading="!files"
                      class="mr-2"
                    >
                      <code slot="label">{{ file.filename }}</code>
                    </v-checkbox>
                    <span
                      >{{ file.date || 'No date' }}
                      {{ file.language || 'No language' }}
                      {{ file.notes }}</span
                    >
                  </v-col>
                </v-row>
              </div>
            </template>
          </template>
          <p v-else>
            No spare files found for selected language in
            {{ filter.list }} list.
          </p>
        </template>
        <p v-else>Loading files…</p>
      </template>
      <p v-else-if="!errors.getLists">
        Choose list and language to select files.
      </p>
      <!-- Comment -->
      <v-textarea
        v-model="allotment.comment"
        filled
        label="Comment"
        rows="3"
      ></v-textarea>
      <!-- Buttons -->
      <div>
        <v-btn @click="allot" :loading="submissionStatus === 'inProgress'"
          >Allot</v-btn
        >
        <p v-if="errors.processAllotment" class="mb-0 d-inline red--text">
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
      <h4 class="alert-heading">Allotted successfully</h4>
      <p class="mb-0">
        <v-btn @click="reset">Make another allotment</v-btn>
      </p>
    </v-alert>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import 'firebase/functions';
import _ from 'lodash';

import ErrorMessages from '@/mixins/ErrorMessages';
import { initialAllotment, initialAllotmentFilter } from '@/utility';

@Component({
  name: 'CRAllotment',
  title: 'Content Reporting',
})
export default class CRAllotment extends Mixins<ErrorMessages>(ErrorMessages) {
  assignees: any = null;
  languages: string[] = ['English', 'Hindi', 'Bengali', 'None'];
  lists = null;
  files: any = null;
  filter = initialAllotmentFilter();
  allotment: any = initialAllotment();
  submissionStatus: string | null = null;

  async mounted() {
    this.filter.languages = this.languages;
    this.getAssignees();
    this.getLists();
  }

  async getAssignees() {
    const assignees = await this.$http.get(
      process.env.VUE_APP_ASSIGNEES_URL as string
    );

    if (!assignees) return;

    this.assignees = assignees.data;
    if (this.$route.query.emailAddress) {
      this.allotment.assignee = this.assignees.find(
        (assignee: any) =>
          assignee.emailAddress === this.$route.query.emailAddress
      );
    }
  }

  async getLists() {
    const lists = await this.$http.jsonp(
      process.env.VUE_APP_CR_LISTS_URL as string
    );

    if (!lists) return;
    this.lists = lists.data;
  }

  get assigneeHint() {
    const languages = _.get(this.allotment, 'assignee.languages', []);
    const hint = languages.join(', ');
    return hint ? `Languages: ${hint}` : '';
  }

  @Watch('allotment.assignee')
  handleAllotmentAssignee(newValue: any) {
    if (newValue === null) return;

    this.filter.languages = this.languages;
  }

  debouncedFilter = _.debounce(async function (this: any) {
    this.files = null;
    this.allotment.files = [];
    if (this.filter.list === null) return;

    const spareFiles = await this.$http.get(process.env.VUE_APP_CR_FILES_URL, {
      params: this.filter,
    });

    if (!spareFiles) return;
    this.files = spareFiles.data;
  }, 1000);

  @Watch('filter', { deep: true })
  handleFilter() {
    this.debouncedFilter();
  }

  async allot() {
    this.submissionStatus = 'inProgress';
    try {
      await this.$http.post(
        process.env.VUE_APP_CR_ALLOT_URL as string,
        this.allotment
      );
      this.errors = {};
      this.submissionStatus = 'complete';
    } catch (error) {
      this.addErrorMessage('processAllotment')(error);
      this.submissionStatus = 'error';
    }
  }

  reset() {
    this.filter = initialAllotmentFilter();
    this.allotment = initialAllotment();
    this.submissionStatus = null;
  }
}
</script>

<style scoped>
>>> .v-item-group {
  flex-wrap: wrap;
}
</style>
