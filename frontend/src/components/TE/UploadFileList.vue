<template>
  <v-list two-line>
    <template v-for="[file, status] in files">
      <v-list-item :key="file.upload.uuid">
        <v-list-item-content>
          <v-list-item-subtitle :style="{ color: 'red' }" v-if="status.error">
            {{ status.error }}
          </v-list-item-subtitle>
          <v-list-item-subtitle v-else-if="status.retrying">
            Retrying upload
          </v-list-item-subtitle>
          <v-list-item-subtitle v-else-if="status.state === 'queued'">
            Queued
          </v-list-item-subtitle>
          <v-list-item-title>{{ file.name }}</v-list-item-title>
        </v-list-item-content>

        <v-list-item-action :style="{ flexDirection: 'row' }">
          <v-btn v-if="status.error" @click="$emit('delete-file', file)">
            remove
          </v-btn>
          <div v-else>
            <v-progress-circular
              v-if="status.state === 'uploading'"
              :value="status.progress"
              color="green"
              :style="{ marginRight: '16px' }"
            ></v-progress-circular>
            <v-btn
              @click="$emit('cancel-file', status, file)"
              v-if="status.state === 'uploading' || status.state === 'queued'"
            >
              Cancel
            </v-btn>
            <v-icon v-if="status.state === 'completed'" color="green">
              fa-check-circle
            </v-icon>
          </div>
        </v-list-item-action>
      </v-list-item>
      <v-divider :key="`divider-${file.upload.uuid}`"></v-divider>
    </template>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "UploadFileList"
})
export default class UploadFileList extends Vue {
  @Prop() files!: [File, any][];
}
</script>

<style scoped></style>
