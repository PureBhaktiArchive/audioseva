<script setup>
import Chip from 'primevue/chip';

// Typing idea is borrowed from https://github.com/vuejs/language-tools/issues/1261#issuecomment-1732695149
// Issue: https://github.com/vuejs/rfcs/discussions/584
defineProps({
  stage: {
    /** @returns {Stage} */
    default: () => null,
  },
  status: {
    /** @returns {Status} */
    default: () => null,
  },
});
</script>

<template>
  <Chip
    :label="stage"
    class="border-2 py-0"
    :class="{
      ['bg-green-200']: stage === 'TRSC',
      ['bg-red-200']: stage === 'FC1',
      ['bg-yellow-200']: stage === 'DCRT',
      // Statuses
      ['border-green-300']: status === 'Done',
      ['border-blue-300']: status === 'Given',
      ['border-amber-900']: status === 'Drop',
    }"
  ></Chip>
</template>
