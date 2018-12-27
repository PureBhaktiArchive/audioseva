<template>
  <v-chip :color="soundQualityRatingColor[task.soundQualityRating]">
    <span class="white--text">{{ task.soundQualityRating }}</span>
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "SoundQualityBadge"
})
export default class SoundQualityBadge extends Vue {
  @Prop() task!: any;

  soundQualityRatingColor = {
    Bad: "red",
    Average: "yellow",
    Good: "green"
  };
}
</script>

<style scoped>
</style>
