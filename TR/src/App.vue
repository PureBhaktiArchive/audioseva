<script setup>
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref } from 'vue';
import AuthStatus from './AuthStatus.vue';
import { useAuth } from './auth';

const assignees = ref(/** @type {Assignee[]} */ (null));

const { user } = useAuth();

async function loadAssignees() {
  /** @type {import('firebase/functions').HttpsCallable<{phase:string}, Assignee[]> } */
  const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
  assignees.value = (await getAssignees({ phase: 'TRSC' })).data;
}
</script>

<template>
  <div class="flex flex-col items-center">
    <AuthStatus></AuthStatus>
    <template v-if="user">
      <button class="underline decoration-dotted" @click="loadAssignees">
        Load Devotees
      </button>
      <span v-if="assignees">Devotees: {{ assignees.length }}</span>
    </template>
  </div>
</template>
