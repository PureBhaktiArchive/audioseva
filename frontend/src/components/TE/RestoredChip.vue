<template>
  <v-chip dark small :color="isRestored ? '#388E3C' : '#2196F3'">
    {{ isRestored ? 'SEd' : 'Non-SEd' }}
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  name: 'RestoredChip',
})
export default class RestoredChip extends Vue {
  @Prop({ default: false }) isRestored!: boolean;
}
</script>

<style scoped></style>
