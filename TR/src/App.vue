<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import { computed, ref } from 'vue';
import AuthStatus from './AuthStatus.vue';
import { useAuth } from './auth';

const assignees = ref(/** @type {Assignee[]} */ (null));

const { isAuthenticated } = useAuth();

async function loadAssignees() {
  /** @type {import('firebase/functions').HttpsCallable<{phase:string}, Assignee[]> } */
  const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
  assignees.value = (await getAssignees({ phase: 'TRSC' })).data;
}

const files = ref([
  {
    id: 326,
    languages: ['English'],
    note: 'Some note goes here',
    duration: 17 * 60 + 40,
    parts: [
      {
        number: 1,
        completed: true,
        stages: [
          {
            stage: 'TRSC',
            status: 'Done',
          },
          {
            stage: 'FC1',
            status: 'Done',
          },
        ],
      },
      {
        number: 2,
        completed: false,
        stages: [
          {
            stage: 'TRSC',
            status: 'Given',
          },
        ],
      },
      {
        number: 3,
        completed: false,
        stages: [
          {
            stage: 'TRSC',
            status: 'Given',
          },
        ],
      },
    ],
  },
  {
    id: 175,
    languages: ['Hindi'],
    duration: 13 * 60 + 27,
    parts: [
      {
        number: 1,
        completed: true,
        stages: [
          {
            stage: 'TRSC',
            status: 'Done',
          },
          {
            stage: 'FC1',
            status: 'Done',
          },
        ],
      },
      {
        number: 2,
        completed: true,
        stages: [
          {
            stage: 'TRSC',
            status: 'Done',
          },
          {
            stage: 'FC1',
            status: 'Done',
          },
        ],
      },
    ],
    stages: [
      {
        stage: 'LANG',
        status: 'Done',
      },
    ],
  },
]);

const units = computed(() =>
  files.value.map((file) => ({
    ...file,
    // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss#comment65343664_25279399
    duration: new Date(1000 * file.duration).toISOString().substring(11, 19),
    partsCompleted: file.parts.reduce(
      (count, { completed }) => (completed ? ++count : count),
      0
    ),
  }))
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <AuthStatus></AuthStatus>
    <template v-if="isAuthenticated">
      <button
        class="self-start underline decoration-dotted"
        @click="loadAssignees"
      >
        Load Devotees
      </button>
      <span v-if="assignees">Devotees: {{ assignees.length }}</span>
      <ul class="flex w-full flex-col gap-2">
        <li class="rounded-md border p-2" v-for="file in units" :key="file.id">
          <div class="flex items-center gap-2">
            <span class="font-bold">{{ file.id }}</span>
            <Badge
              :severity="
                file.partsCompleted === file.parts.length ? 'success' : 'info'
              "
              >{{ file.partsCompleted }} / {{ file.parts.length }}</Badge
            >
            <span class="ml-auto font-mono">
              {{ file.duration }}
            </span>
          </div>
          <span v-if="file.note" v-html="file.note"></span>
          <!-- Parts -->
          <ul class="mt-2 flex flex-col gap-2 border-t pl-2 pt-2">
            <li
              class="flex items-center gap-2"
              v-for="part in file.parts"
              :key="part.number"
            >
              <span class="font-semibold">part-{{ part.number }}</span>
              <!-- Stages -->
              <ul class="flex gap-2">
                <li
                  class="rounded-full border bg-neutral-200 px-2"
                  v-for="stage in part.stages"
                  :key="stage.stage"
                  v-html="stage.stage"
                ></li>
              </ul>
              <Tag
                v-if="part.completed"
                severity="success"
                value="Completed"
                class="ml-auto uppercase"
              ></Tag>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </div>
</template>
