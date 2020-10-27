/* import { functions } from 'firebase'; * sri sri guru gauranga jayatah */
<template>
  <div class="pa-3 listening-page">
    <div class="pb-3">
      <h3>{{ $title }}</h3>
    </div>
    <h3 class="headline mb-0">Audio Player</h3>
    <v-card color="#d9edf7" class="my-2">
      <v-card-title primary-title>
        <audio
          ref="audioPlayer"
          controls="controls"
          :src="audioUrl"
          style="display: block; width: 100%"
        >
          Your browser does not support embedding audio.
        </audio>
      </v-card-title>
      <v-card-title primary-title>
        <small>
          To download the file, please click the following link:
          <a :href="audioUrl">Download.</a>
        </small>
      </v-card-title>
    </v-card>
    <v-alert type="warning" v-if="errorMessage" :value="true">
      {{ errorMessage }}
    </v-alert>
    <v-card>
      <v-card-title primary-title>
        <div>
          <p class="text-justify">
            When you fill the Online Submission Form, please provide as many
            details as you can especially about sound quality because we are
            depending entirely on your feedback to process these files in the
            sound editing stage. Please mention if there is any background
            noise, abrupt sounds, blank spaces, low sound volume, etc. If you
            miss to provide some input, chances are, the issue will be part of
            the final archive.
          </p>
        </div>
      </v-card-title>
    </v-card>
  </div>
</template>

<style>
@media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
  .listening-page {
    max-width: 90vw;
  }
}
</style>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({
  name: 'Listen',
})
export default class ListenAudio extends Vue {
  fileName: string = '';
  errorMessage = '';

  $refs!: {
    audioPlayer: HTMLMediaElement;
  };

  mounted() {
    this.fileName = this.$route.params.fileName;
    this.$title = `Audio File Name: ${this.fileName.split('.')[0]}`;
    this.$refs.audioPlayer &&
      this.$refs.audioPlayer.addEventListener('error', this.handleFileError);
  }

  destroyed() {
    this.$refs.audioPlayer &&
      this.$refs.audioPlayer.removeEventListener('error', this.handleFileError);
  }

  handleFileError(e: any) {
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        this.errorMessage = 'You aborted the media playback.';
        break;
      case e.target.error.MEDIA_ERR_NETWORK:
        this.errorMessage =
          'A network error caused the media download to fail.';
        break;
      case e.target.error.MEDIA_ERR_DECODE:
        this.errorMessage =
          'The media playback was aborted due to a corruption problem or because the media ' +
          'used features your browser did not support.';
        break;
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        this.errorMessage =
          'The media could not be loaded, either because the server or network failed or because the format is not supported.';
        break;
      default:
        this.errorMessage = 'An unknown media error occurred';
    }
  }

  get audioUrl() {
    return `/download/${this.fileName}`;
  }
}
</script>
