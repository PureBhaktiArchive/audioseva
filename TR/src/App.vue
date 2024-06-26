<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoComplete from 'primevue/autocomplete';
import Badge from 'primevue/badge';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { computed, onMounted, ref } from 'vue';
import AuthStatus from './AuthStatus.vue';
import StagesList from './StagesList.vue';
import { useAuth } from './auth';

const { isAuthenticated } = useAuth();

const allStages = ['TRSC', 'FC1', 'RFC', 'TTV', 'DCRT', 'LANG', 'FC2', 'FINAL'];

const assignees = ref(/** @type {Assignee[]} */ (null));
const filteredAssignees = ref(assignees.value);
/**
 * @param {import('primevue/autocomplete').AutoCompleteCompleteEvent} event
 */
const searchAssignees = (event) => {
  const query = event.query.trim().toLowerCase();
  // Forcefully mutating the suggestions due to AutoComplete's issues: https://github.com/primefaces/primevue/issues/5601
  filteredAssignees.value = [
    ...(query.length && assignees.value
      ? assignees.value.filter((assignee) =>
          assignee.name.toLowerCase().startsWith(query)
        )
      : assignees.value),
  ];
};

const selectedAssignee = ref(/** @type {Assignee} */ (null));
const assigneesLoading = ref(false);

async function loadAssignees() {
  assigneesLoading.value = true;
  try {
  /** @type {import('firebase/functions').HttpsCallable<{skills: string[]}, Assignee[]> } */
  const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
  assignees.value = (await getAssignees({ skills: allStages })).data;
  } finally {
    assigneesLoading.value = false;
  }
}

const language = ref(/** @type {string} */ (null));
const languages = ref(/** @type {string[]} */ ([]));
languages.value = ['Hindi', 'English'];

const files = ref(
  /** @type {AllotmentUnit[]} */ ([
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
              name: 'TRSC',
              status: 'Done',
            },
            {
              name: 'FC1',
              status: 'Done',
            },
          ],
        },
        {
          number: 2,
          completed: false,
          stages: [
            {
              name: 'TRSC',
              status: 'Given',
            },
          ],
        },
        {
          number: 3,
          completed: false,
          stages: [
            {
              name: 'TRSC',
              status: 'Given',
            },
          ],
        },
      ],
    },
    {
      id: 50,
      languages: ['English'],
      duration: 45 * 60 + 11,
      stages: [
        {
          name: 'RFC',
          status: 'Given',
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
              name: 'TRSC',
              status: 'Done',
            },
            {
              name: 'FC1',
              status: 'Done',
            },
          ],
        },
        {
          number: 2,
          completed: true,
          stages: [
            {
              name: 'TRSC',
              status: 'Done',
            },
            {
              name: 'FC1',
              status: 'Done',
            },
          ],
        },
      ],
      stages: [
        {
          name: 'LANG',
          status: 'Done',
        },
      ],
    },
  ])
);

const units = computed(() =>
  files.value
    .filter((file) => file.languages.includes(language.value))
    .map((file) => ({
      ...file,
      // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss#comment65343664_25279399
      duration: new Date(1000 * file.duration).toISOString().substring(11, 19),
      partsCompleted: file.parts?.reduce(
        (count, { completed }) => (completed ? ++count : count),
        0
      ),
    }))
);

onMounted(() => {
  loadAssignees();
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <AuthStatus></AuthStatus>
    <template v-if="isAuthenticated">
      <!-- Assignees -->
      <AutoComplete
        v-model="selectedAssignee"
        dropdown
        completeOnFocus
        autoOptionFocus
        placeholder="Select a devotee"
        optionLabel="name"
        :loading="assigneesLoading"
        :suggestions="filteredAssignees"
        @complete="searchAssignees"
      />
      <!-- Languages -->
      <SelectButton v-model="language" :options="languages"></SelectButton>
      <!-- Files -->
      <Message v-if="!language" severity="secondary">
        Select a language to see available files.
      </Message>
      <ul v-else class="flex w-full flex-col gap-2">
        <li class="rounded-md border p-2" v-for="file in units" :key="file.id">
          <div class="flex items-center gap-2">
            <span class="font-bold">{{ file.id }}</span>
            <Badge
              v-if="file.parts?.length > 0"
              :severity="
                file.partsCompleted === file.parts.length ? 'success' : 'info'
              "
              >{{ file.partsCompleted }} / {{ file.parts.length }}</Badge
            >
            <!-- Stages -->
            <div v-if="file.stages" class="flex flex-wrap gap-2">
              <StagesList :stages="file.stages"></StagesList>
            </div>

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
              <div class="flex flex-wrap gap-2">
                <StagesList :stages="part.stages"></StagesList>
              </div>
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
