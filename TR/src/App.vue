<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoComplete from 'primevue/autocomplete';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { computed, ref, watch } from 'vue';
import AuthStatus from './AuthStatus.vue';
import StageChip from './StageChip.vue';
import { useAuth } from './auth';
import { formatDurationForHumans } from './duration';

const { isAuthenticated } = useAuth();

/** @type {Stage[]} */
const allStages = ['TRSC', 'FC1', 'TTV', 'DCRT', 'LANG', 'FC2', 'FINAL'];

const assignees = ref(/** @type {Assignee[]} */ (null));
const filteredAssignees = ref(assignees.value);
/**
 * @param {import('primevue/autocomplete').AutoCompleteCompleteEvent} event
 */
const searchAssignees = (event) => {
  const query = event.query.trim().toLowerCase();
  if (!assignees.value) return;
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

const loadAssignees = async () => {
  assigneesLoading.value = true;
  try {
    /** @type {import('firebase/functions').HttpsCallable<{skills: Stage[]}, Assignee[]> } */
    const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
    assignees.value = (await getAssignees({ skills: allStages })).data;
    // @ts-expect-error -- For some reason it thinks that import.meta is not available here.
    if (import.meta.env.DEV) selectedAssignee.value = assignees.value?.[0];
  } finally {
    assigneesLoading.value = false;
  }
};

loadAssignees().catch((reason) =>
  console.log('Error getting assignees:', reason)
);

const selectedLanguage = ref(/** @type {string} */ (null));
const languages = computed(() =>
  selectedAssignee.value ? selectedAssignee.value.languages : null
);

const stages = computed(() =>
  selectedAssignee.value ? selectedAssignee.value.skills : null
);
const selectedStage = ref('');

watch(
  selectedAssignee,
  (assignee) =>
    (
      // Selecting a primary language of an assignee by default
      (selectedLanguage.value = assignee ? assignee.languages?.[0] : null),
      (selectedStage.value = stages.value?.[0])
    )
);

const files = ref(/** @type {FileToAllot[]} */ (null));

const filteredFiles = computed(() =>
  files.value?.flatMap((file) =>
    file.languages.includes(selectedLanguage.value)
      ? [
          {
            ...file,
            parts: file.parts?.map((part) => ({
              ...part,
              duration: formatDurationForHumans(part.duration),
            })),
            duration: formatDurationForHumans(file.duration),
          },
        ]
      : []
  )
);
const filesLoading = ref(false);
const loadFiles = async () => {
  filesLoading.value = true;
  try {
    /** @type {import('firebase/functions').HttpsCallable<never, FileToAllot[]> } */
    const getFiles = httpsCallable(getFunctions(), 'TR-getFiles');
    files.value = (await getFiles()).data;
  } finally {
    filesLoading.value = false;
  }
};
loadFiles().catch((reason) => console.log('Error getting files:', reason));
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
      <SelectButton
        v-model="selectedLanguage"
        :options="languages"
        :allowEmpty="false"
      ></SelectButton>
      <!-- Stages -->
      <SelectButton
        v-model="selectedStage"
        :options="stages"
        :allowEmpty="false"
        class="flex-wrap"
      ></SelectButton>
      <!-- Files -->
      <ul class="flex w-full flex-col gap-2">
        <li
          class="rounded-md border p-2"
          v-for="file in filteredFiles"
          :key="file.id"
        >
          <div class="flex items-center gap-2">
            <span class="font-bold">{{ file.id }}</span>
            <!-- Latest Stage -->
            <StageChip
              v-if="file.latestStage"
              :stage="file.latestStage"
              :status="file.latestStatus"
            ></StageChip>
            <span class="ml-auto font-mono">
              {{ file.duration }}
            </span>
          </div>
          <span v-if="file.note" v-html="file.note"></span>
          <!-- Parts -->
          <ul
            v-if="file.parts?.length > 0"
            class="mt-2 flex flex-col gap-2 border-t pl-2 pt-2"
          >
            <li
              class="flex items-center gap-2"
              v-for="part in file.parts"
              :key="part.number"
            >
              <span>part-{{ part.number }}</span>
              <!-- Latest Stage -->
              <StageChip
                v-if="part.latestStage"
                :stage="part.latestStage"
                :status="part.latestStatus"
                class="text-sm"
              ></StageChip>
              <Tag
                v-if="part.completed"
                severity="success"
                value="Completed"
                class="text-sm uppercase"
              ></Tag>
              <span class="ml-auto font-mono">
                {{ part.duration }}
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </div>
</template>
