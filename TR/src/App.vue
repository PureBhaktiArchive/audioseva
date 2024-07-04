<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoComplete from 'primevue/autocomplete';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import { computed, ref, watch } from 'vue';
import AuthStatus from './AuthStatus.vue';
import StageChip from './StageChip.vue';
import StatusChip from './StatusChip.vue';
import { useAuth } from './auth';
import { formatDurationForHumans } from './duration';
import { canUnitBeAllottedForStage } from './workflow';

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
const selectedStage = ref(/** @type {Stage} */ (null));

watch(
  selectedAssignee,
  (assignee) =>
    (
      // Selecting a primary language of an assignee by default
      (selectedLanguage.value = assignee ? assignee.languages?.[0] : null),
      (selectedStage.value = stages.value?.[0])
    )
);

// Search query for free filtering
const query = ref('');
const queryId = computed(() => (/\d+/.test(query.value) ? +query.value : null));
const searchTerm = computed(() => query.value?.toLowerCase());

const files = ref(/** @type {FileToAllot[]} */ (null));

const filteredFiles = computed(() =>
  files.value?.flatMap((file) => {
    if (!file.languages.includes(selectedLanguage.value)) return [];

    const parts = file.parts?.map((part) => ({
      ...part,
      duration: formatDurationForHumans(part.duration),
      canBeAllotted: canUnitBeAllottedForStage(part, selectedStage.value),
    }));
    const fileCanBeAllotted = canUnitBeAllottedForStage(
      file,
      selectedStage.value
    );

    return (
      query.value
        ? // If query is present then we show all matching files regardless of the workflow considerations
          file.id === queryId.value ||
          file.notes?.toLowerCase().includes(searchTerm.value) ||
          file.title?.toLowerCase().includes(searchTerm.value)
        : fileCanBeAllotted || parts?.some((part) => part.canBeAllotted)
    )
      ? [
          {
            ...file,
            duration: formatDurationForHumans(file.duration),
            canBeAllotted: fileCanBeAllotted,
            parts,
          },
        ]
      : [];
  })
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
      <!-- Search bar -->
      <InputText
        v-if="selectedLanguage"
        v-model.trim="query"
        placeholder="Search wild"
      ></InputText>
      <Message severity="secondary" v-if="!filteredFiles">
        Select a devotee, language and stage to list the files.
      </Message>
      <!-- Files -->
      <ul
        class="flex w-full flex-col gap-2"
        v-else-if="filteredFiles.length > 0"
      >
        <li
          class="flex flex-col gap-y-1 rounded-md border p-2"
          v-for="file in filteredFiles"
          :key="file.id"
        >
          <div
            class="flex items-center gap-2 rounded-md p-2"
            :class="[file.canBeAllotted ? 'cursor-pointer bg-fuchsia-50' : '']"
          >
            <span class="font-bold">{{ file.id }}</span>
            <!-- Latest Stage -->
            <StageChip
              v-if="file.latestStage"
              :stage="file.latestStage"
            ></StageChip>
            <StatusChip
              v-if="file.latestStatus"
              :status="file.latestStatus"
            ></StatusChip>
            <span class="ml-auto font-mono font-bold">
              {{ file.duration }}
            </span>
          </div>
          <span v-if="file.title" class="px-2 text-xs">{{ file.title }}</span>
          <span v-if="file.notes" class="px-2 text-xs">{{ file.notes }}</span>
          <!-- Parts -->
          <ul v-if="file.parts?.length > 0" class="flex flex-col gap-0.5">
            <li
              class="flex items-center gap-2 rounded-md p-2 text-sm"
              :class="[
                part.canBeAllotted ? 'cursor-pointer bg-fuchsia-50' : '',
              ]"
              v-for="part in file.parts"
              :key="part.number"
            >
              <span>part-{{ part.number }}</span>
              <!-- Latest Stage -->
              <StageChip
                v-if="part.latestStage"
                :stage="part.latestStage"
              ></StageChip>
              <StatusChip
                v-if="part.latestStatus"
                :status="part.latestStatus"
              ></StatusChip>
              <Tag
                v-if="part.completed"
                severity="success"
                value="Completed"
                class="text-xs uppercase"
              ></Tag>
              <span class="ml-auto font-mono">
                {{ part.duration }}
              </span>
            </li>
          </ul>
        </li>
      </ul>
      <Message severity="info" v-else>
        There are no files in the selected language that can be allotted for the
        selected stage.
      </Message>
    </template>
  </div>
</template>
