<template>
  <div>
    <header>
      <h1>My Tasks</h1>
    </header>
    <div v-if="isLoadingTasks">
      Loading tasks
    </div>
    <div v-else-if="tasks && !tasks.length">
      No tasks
    </div>
    <template v-else>
      <template v-for="task in tasks">
        <v-layout wrap :key="task['.key']">
          <v-flex class="d-flex" :style="{ alignItems: 'center' }" xs4 sm3 md2>
            {{ task.trackEditing.status }}
          </v-flex>
          <v-flex md3>
            <unwanted-parts :item="task"></unwanted-parts>
          </v-flex>
          <v-flex md3>
            <task-definition :item="task"></task-definition>
          </v-flex>
        </v-layout>
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/database";
import { mapState } from "vuex";

import UnwantedParts from "@/components/TE/UnwantedParts.vue";
import TaskDefinition from "@/components/TE/TaskDefinition.vue";

@Component({
  name: "MyTasks",
  computed: {
    ...mapState("user", ["currentUser"])
  },
  components: { TaskDefinition, UnwantedParts }
})
export default class MyTasks extends Vue {
  tasks: any[] | null = null;
  isLoadingTasks = false;

  mounted() {
    this.isLoadingTasks = true;
    this.getTasks();
  }

  getTasks() {
    this.$bindAsArray("tasks", firebase.database().ref("/edited"), null, () => {
      if (this.tasks) {
        this.tasks = this.tasks.reduce((lists, list) => {
          return [...lists, ...this.filterTasks(list)];
        }, []);
        this.isLoadingTasks = false;
      }
    });
  }

  filterTasks(list: any) {
    return Object.entries(list).reduce(
      (items: any, [listItemKey, listItemValue]: any) => {
        if (
          listItemKey !== ".key" &&
          listItemValue.trackEditing.assignee.emailAddress ===
            this.currentUser.email
        ) {
          items.push({ [".key"]: listItemKey, ...listItemValue });
        }
        return items;
      },
      []
    );
  }
}
</script>

<style scoped>
</style>
