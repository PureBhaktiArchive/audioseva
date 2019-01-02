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
    <v-card color="#d9edf7">
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

<script>
export default {
  name: "ListenAudio",
  data: () => ({
    fileName: null,
  }),
  mounted: function() {
    this.fileName = this.$route.params.fileName;
  },
  computed: {
    audioUrl: function() {      
      let nameAndExtension = this.fileName ? this.fileName.split("."): [];
      let list = nameAndExtension && nameAndExtension[0] ? nameAndExtension[0].split("-")[0]: null;
      let folder = nameAndExtension && nameAndExtension[1] && nameAndExtension[1] == "mp3" ? "mp3": "source";
      return `http://original.${process.env.VUE_APP_STORAGE_ROOT_DOMAIN}/${folder}/${list}/${this.fileName}`;
    },
    audioFileName: function() {
      return this.fileName ? this.fileName.split('.')[0]: null;
    }
  }
};
</script>
