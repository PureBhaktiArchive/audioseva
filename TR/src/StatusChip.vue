<script setup>
import Chip from 'primevue/chip';

// Typing idea is borrowed from https://github.com/vuejs/language-tools/issues/1261#issuecomment-1732695149
// Issue: https://github.com/vuejs/rfcs/discussions/584
defineProps({
  status: {
    /** @returns {Status} */
    default: () => null,
  },
});
</script>

<template>
  <Chip
    :label="status"
    class="py-0"
    :class="{
      ['bg-green-300 text-green-900']: status === 'Done',
      ['bg-blue-300 text-blue-800']: status === 'Given',
      ['bg-amber-900 text-amber-200']: status === 'Drop',
    }"
  ></Chip>
</template>
