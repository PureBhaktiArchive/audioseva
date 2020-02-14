<template>
  <v-list two-line>
    <file-list
      listPrefix="upload"
      :fileList="uploadingFiles"
      :getKey="([file]) => file.upload.uuid"
    >
      <template v-slot:content="{ file: [file, status] }">
        <v-list-item-content>
          <v-list-item-subtitle :style="{ color: 'red' }" v-if="status.error">
            {{ status.error }}
          </v-list-item-subtitle>
          <v-list-item-subtitle v-else-if="status.retrying">
            Retrying upload
          </v-list-item-subtitle>
          <v-list-item-title>{{ file.name }}</v-list-item-title>
        </v-list-item-content>
      </template>
      <template v-slot:action="{ file: [file, status] }">
        <v-btn v-if="status.error" @click="$emit('delete-file', file)">
          remove
        </v-btn>
        <div v-else>
          <v-progress-circular
            :value="status.progress"
            color="green"
            :style="{ marginRight: '16px' }"
          ></v-progress-circular>
          <v-btn
            @click="$emit('cancel-file', status, file)"
            v-if="status.uploading"
          >
            Cancel
          </v-btn>
        </div>
      </template>
    </file-list>
    <file-list :fileList="queuedFiles" listPrefix="queue">
      <template v-slot:title="{ file }">
        {{ file.name }}
      </template>
      <template v-slot:action="{ file, index }">
        <v-btn @click="$emit('cancel-queued-file', index)">Cancel</v-btn>
      </template>
    </file-list>
    <file-list :fileList="completedFiles" listPrefix="completed">
      <template v-slot:title="{ file }">
        {{ file.name }}
        <v-icon color="green">
          fa-check-circle
        </v-icon>
      </template>
    </file-list>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import UploadFileList from "@/components/TE/UploadFileList.vue";

@Component({
  name: "UploadFilesList",
  components: {
    FileList: UploadFileList
  }
})
export default class UploadFilesList extends Vue {
  @Prop({ default: () => [] }) uploadingFiles!: any[];
  @Prop({ default: () => [] }) queuedFiles!: File[];
  @Prop({ default: () => [] }) completedFiles!: File[];
}
</script>

<style scoped></style>
