<script setup>
import Tag from 'primevue/tag';

// Typing idea is borrowed from https://github.com/vuejs/language-tools/issues/1261#issuecomment-1732695149
// Issue: https://github.com/vuejs/rfcs/discussions/584
defineProps({
  stages: {
    /** @returns {Stage[]} */
    default: () => [],
  },
});
</script>

<template>
  <Tag
    v-for="stage in stages"
    :key="stage.name"
    severity="secondary"
    :value="stage.name"
    rounded
  >
  </Tag>
</template>
