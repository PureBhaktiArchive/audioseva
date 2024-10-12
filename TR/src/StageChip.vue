<script setup>
import Chip from 'primevue/chip';

// Typing idea is borrowed from https://github.com/vuejs/language-tools/issues/1261#issuecomment-1732695149
// Issue: https://github.com/vuejs/rfcs/discussions/584
defineProps({
  stage: {
    /** @returns {Stage} */
    default: () => null,
  },
});
</script>

<template>
  <Chip
    :label="stage"
    class="py-0"
    :class="{
      ['bg-green-200 text-green-900']: stage === 'TRSC',
      ['bg-red-200 text-red-900']: stage === 'FC1',
      ['bg-blue-900 text-sky-200']: stage === 'TTV',
      ['bg-yellow-200']: stage === 'DCRT',
      ['bg-lime-500 text-blue-900']: stage === 'LANG',
      ['bg-red-900 text-red-200']: stage === 'FC2',
      ['bg-green-900 text-lime-200']: stage === 'FINAL',
    }"
  ></Chip>
</template>
