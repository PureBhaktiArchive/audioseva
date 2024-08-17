<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import AutoComplete from 'primevue/autocomplete';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';
import AuthStatus from './AuthStatus.vue';
import StageChip from './StageChip.vue';
import StatusChip from './StatusChip.vue';
import { useAuth } from './auth';
import { formatDurationForHumans } from './duration';
import { canUnitBeAllotted, getStagesForSkillsAndLanguage } from './workflow';

const { isAuthenticated } = useAuth();

const toast = useToast();

/** @type {Stage[]} */
const allStages = ['TRSC', 'FC1', 'TTV', 'DCRT', 'LANG', 'FC2', 'PR', 'FINAL'];

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
      ? assignees.value.filter(
          (assignee) =>
            assignee.name.toLowerCase().startsWith(query) ||
            assignee.emailAddress.toLowerCase().includes(query)
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
  selectedAssignee.value && selectedLanguage.value
    ? getStagesForSkillsAndLanguage(
        selectedAssignee.value.skills,
        selectedLanguage.value
      )
    : null
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
// Don't perform workflow checks if we searched for a file explicitly
const stageForWorkflowChecks = computed(() =>
  query.value ? null : selectedStage.value
);

/**
 * @typedef {(duration: number) => boolean} DurationFilter
 * @typedef {object} DurationCategory
 * @property {string} name
 * @property {DurationFilter} filter
 */

/** @type {import('vue').Ref<DurationCategory[]>} */
const durationCategories = ref([
  {
    name: 'Short',
    filter: (duration) => duration <= 25 * 60,
  },
  {
    name: 'Long',
    filter: (duration) => duration > 25 * 60,
  },
]);
/** @type {import("vue").Ref<DurationCategory>} */
const selectedDurationCategory = ref(null);

/** @type {import('vue').ComputedRef<DurationFilter>} */
const durationFilter = computed(() =>
  query.value || !selectedDurationCategory.value
    ? null
    : (duration) => selectedDurationCategory.value.filter(duration)
);

const files = ref(/** @type {FileToAllot[]} */ (null));

const filteredFiles = computed(() =>
  files.value?.flatMap((file) => {
    if (!file.languages.includes(selectedLanguage.value)) return [];

    if (durationFilter.value && !durationFilter.value(file.duration)) return [];

    const parts = file.parts?.map((part) => ({
      ...part,
      duration: formatDurationForHumans(part.duration),
      canBeAllotted: canUnitBeAllotted(part, stageForWorkflowChecks.value),
    }));
    const fileCanBeAllotted = canUnitBeAllotted(
      file,
      stageForWorkflowChecks.value
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

/** @type {import('vue').Ref<number>} */
const selectedFile = ref(null);

/**
 * @param {number} id
 */
const toggleFile = (id) => {
  selectedFile.value = selectedFile.value === id ? null : id;
  // No parts should be selected because a whole file was selected or de-selected
  selectedParts.value.clear();
};

/** @type {import('vue').Ref<Set<number>>} */
const selectedParts = ref(new Set());

/**
 * @param {number} id File ID
 * @param {number} number Part number
 */
const togglePart = (id, number) => {
  if (selectedFile.value !== id) {
    selectedParts.value.clear();
    selectedFile.value = id;
  }
  if (selectedParts.value.has(number)) {
    selectedParts.value.delete(number);
    if (selectedParts.value.size === 0) selectedFile.value = null;
  } else selectedParts.value.add(number);
};

watch(selectedStage, () => {
  selectedFile.value = null;
  selectedParts.value.clear();
});

const hasSelection = computed(() => !!selectedFile.value);
const allotmentSummary = computed(
  () =>
    `#${selectedFile.value}${selectedParts.value.size > 0 ? ` (parts ${[...selectedParts.value]})` : ''} for ${selectedStage.value} to ${selectedAssignee.value.name}`
);

const message = ref('');

const allotmentInProgress = ref(false);
const allot = async () => {
  allotmentInProgress.value = true;
  try {
    await httpsCallable(
      getFunctions(),
      'TR-allot'
    )({
      assignee: selectedAssignee.value,
      stage: selectedStage.value,
      language: selectedLanguage.value,
      id: selectedFile.value,
      parts: [...selectedParts.value],
      message: message.value,
    });
    toast.add({
      severity: 'success',
      summary: 'Allotment successful',
      detail: `${allotmentSummary.value}\n${message.value}`,
    });
    selectedFile.value = null;
    selectedAssignee.value = null;
    message.value = null;
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Allotment error',
      detail: e,
    });
  } finally {
    allotmentInProgress.value = false;
  }
};
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
      >
        <template #option="slotProps">
          <div class="flex grow items-center gap-x-1 max-sm:flex-wrap">
            <span>{{ slotProps.option.name }}</span>
            <span class="ml-auto text-xs">
              {{ slotProps.option.emailAddress }}
            </span>
          </div>
        </template>
      </AutoComplete>
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
      <div class="flex flex-wrap gap-2" v-if="selectedLanguage">
        <!-- Search bar -->
        <InputText
          v-model.trim="query"
          placeholder="Search wild"
          class="grow"
        ></InputText>
        <SelectButton
          v-model="selectedDurationCategory"
          :options="durationCategories"
          v-show="!query"
          optionLabel="name"
        />
      </div>
      <Message severity="secondary" v-if="!selectedLanguage || !selectedStage">
        Select a devotee, language and stage to list the files.
      </Message>
      <ProgressBar
        v-else-if="filesLoading"
        mode="indeterminate"
        class="h-2"
      ></ProgressBar>
      <!-- Files -->
      <ul
        class="flex w-full select-none flex-col gap-2"
        v-else-if="filteredFiles.length > 0"
      >
        <li
          class="flex flex-col gap-y-1 rounded-md border p-2"
          v-for="file in filteredFiles"
          :key="file.id"
        >
          <div
            class="flex items-center gap-2 rounded-md p-2"
            :class="
              file.canBeAllotted
                ? [
                    'cursor-pointer',
                    file.id === selectedFile ? 'bg-fuchsia-400' : null,
                  ]
                : 'bg-neutral-200'
            "
            @click="file.canBeAllotted && toggleFile(file.id)"
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
            <span
              v-if="file.latestAssignee"
              class="overflow-x-hidden overflow-ellipsis text-nowrap text-sm"
            >
              {{ file.latestAssignee }}
            </span>
            <span class="ml-auto font-mono font-bold">
              {{ file.duration }}
            </span>
          </div>
          <span v-if="file.title" class="px-2 text-xs">{{ file.title }}</span>
          <span v-if="file.notes" class="px-2 text-xs">{{ file.notes }}</span>
          <!-- Parts -->
          <ul v-if="file.parts?.length > 0" class="mt-1 flex flex-col gap-0.5">
            <li
              v-for="part in file.parts"
              :key="part.number"
              class="flex items-center gap-2 rounded-md p-2 text-sm"
              :class="
                part.canBeAllotted
                  ? [
                      'cursor-pointer',
                      file.id === selectedFile && selectedParts.has(part.number)
                        ? 'bg-fuchsia-400'
                        : null,
                    ]
                  : 'bg-neutral-200'
              "
              @click="part.canBeAllotted && togglePart(file.id, part.number)"
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
              <span
                v-else-if="part.latestAssignee"
                class="overflow-x-hidden overflow-ellipsis text-nowrap text-sm"
              >
                {{ part.latestAssignee }}
              </span>
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
      <!-- Allotment -->
      <div class="sticky bottom-0 border-t-2 bg-white py-2" v-if="hasSelection">
        <div class="">Allot {{ allotmentSummary }}</div>
        <div class="flex items-center">
          <InputText
            placeholder="Enter an allotment message (optional)"
            v-model="message"
            class="flex-grow"
            :disabled="allotmentInProgress"
          ></InputText>
          <span
            v-if="!allotmentInProgress"
            class="icon-[fluent--send-48-filled] flex-none cursor-pointer text-4xl text-fuchsia-400"
            @click="allot"
          ></span>
          <span
            v-if="allotmentInProgress"
            class="icon-[line-md--loading-loop] flex-none text-4xl text-fuchsia-400"
          ></span>
        </div>
      </div>
    </template>
  </div>
  <Toast position="bottom-center" />
</template>
