/*
import { functions } from 'firebase';
 * sri sri guru gauranga jayatah
 */
<template>
  <div>
    <v-toolbar :clipped-left="$vuetify.breakpoint.lgAndUp" fixed app>
      <v-toolbar-title>
        <router-link to="/" tag="span" style="cursor: pointer">
          <h3>Audio File Name: {{ audioFileName }}</h3>
        </router-link>
      </v-toolbar-title>
    </v-toolbar>
    <v-alert type="warning" v-if="errorMessage" :value="true">
      {{ errorMessage }}
    </v-alert>
    <v-card v-else color="#d9edf7">
      <v-card-title primary-title>
        <div>
          <h3 class="headline mb-0">Audio Player</h3>
        </div>
      </v-card-title>
      <v-card-title primary-title>
        <audio controls="controls" :src="audioUrl" style="display: block; width: 100%;">
          Your browser does not support embedding audio. Please click
          <a :href="audioUrl">this link</a>.
        </audio>
      </v-card-title>
      <v-card-title primary-title>
        <div>
          <small>
            * To download the file, please click on the three dots on the right of the player above and choose ‘Download’. Please note that your browser may display the download option with the download icon instead or disallow downloading. Alternatively, you can long-tap the following link:
            <a
              :href="audioUrl"
            >Download</a>.
          </small>
        </div>
      </v-card-title>
      <v-card>
        <v-card-title primary-title>
          <div>
            <p class="text-justify">
              When you fill the Online Submission Form, please provide as many details as you can especially about sound quality because we are depending entirely on your feedback to process these files in the sound editing stage. Please
              mention if there is any background noise, abrupt sounds, blank spaces, low sound volume, etc. If you miss to provide some input, chances are, the issue will be part of the final archive.
            </p>
          </div>
        </v-card-title>
      </v-card>
    </v-card>
  </div>
</template>

<style>
</style>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "Listen"
})
export default class ListenAudio extends Vue {
  fileName: string = "";
  errorMessage = "";
  audio!: HTMLMediaElement;

  mounted() {
    this.fileName = this.$route.params.fileName;
    this.audio = document.querySelector("audio") as HTMLMediaElement;
    if (this.isValidFileExtension()) {
      this.audio.addEventListener("error", this.handleFileError);
    }
  }

  destroyed() {
    this.audio.removeEventListener("error", this.handleFileError);
  }

  handleFileError(e: any) {
    if (e.target.error.code === 4) {
      this.errorMessage = `${this.fileName} does not exist.`;
    }
  }

  get nameAndExtension() {
    return this.fileName.split(".");
  }

  isValidFileExtension() {
    if (["mp3", "flac"].includes(this.fileName.split(".")[1])) {
      return true;
    } else {
      this.errorMessage = `Invalid extension on file: ${
        this.fileName
      }. The extension must be mp3 or flac.`;
      return false;
    }
  }

  get audioUrl() {
    const [name] = this.nameAndExtension;
    const list = name ? name.split("-")[0] : null;
    return `http://original.${process.env.VUE_APP_PROJECT_DOMAIN}/${list}/${
      this.fileName
    }`;
  }

  get audioFileName() {
    return this.nameAndExtension[0];
  }
}
</script>
