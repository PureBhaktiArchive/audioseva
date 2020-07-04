<template>
  <v-chip small :color="soundQualityRatingColor[item.soundQualityRating]">
    <span class="white--text">{{ item.soundQualityRating }}</span>
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  name: 'SoundQualityBadge',
})
export default class SoundQualityBadge extends Vue {
  @Prop() item!: any;

  soundQualityRatingColor = {
    Bad: 'red',
    Average: 'yellow',
    Good: 'green',
  };
}
</script>

<style scoped></style>
