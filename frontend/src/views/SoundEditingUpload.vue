<template>
  <div>
    <div v-if="user">
      <h2>Hello, {{ user.name }}</h2>

      <div>
        <vue-dropzone
          ref="myDropzone"
          id="dropzone"
          :options="dropzoneOptions"
          @vdropzone-files-added="filesAdded"
          :useCustomSlot="true"
        >
          <div>
            To upload files you can do one of two things
            <div>Drag and drop files onto the box or click the box and manually select files.</div>
          </div>
        </vue-dropzone>
      </div>
      <div>
        <div v-if="totalUploadCount" :style="{ alignItems: 'center' }" class="d-flex pa-1">
          <span class="pl-2">
            Uploading {{ `${totalUploadCount} item${totalUploadCount > 1 ? 's' : ''}` }}
            | {{ getTotalUploadTime()}}
          </span>
          <div :style="{ justifyContent: 'flex-end', display: 'flex' }">
            <v-btn @click="cancelAllFiles" color="red">Cancel all</v-btn>
          </div>
        </div>
        <v-divider></v-divider>
        <v-list two-line>
          <template v-for="[file, status] in getFiles()">
            <div :key="file.upload.uuid">
              <v-list-tile>
                <v-list-tile-action class="mr-2">
                  <v-btn
                    :href="status.downloadUrl || '#'"
                    :disabled="!status.downloadUrl"
                    :download="file.name"
                    icon
                  >
                    <v-icon>fas fa-download</v-icon>
                  </v-btn>
                </v-list-tile-action>

                <v-list-tile-content>
                  <v-list-tile-sub-title :style="{ color: 'red' }" v-if="status.error">
                    {{ status.error }}
                  </v-list-tile-sub-title>
                  <v-list-tile-title>
                    {{ file.name }}
                  </v-list-tile-title>
                </v-list-tile-content>
                <v-list-tile-action :style="{ flexDirection: 'row' }">
                  <v-btn v-if="status.error" color="red" @click="deleteFile(file)">remove</v-btn>
                  <v-icon color="green" v-else-if="status.complete">fa-check-circle</v-icon>
                  <div v-else>
                    <v-progress-circular
                      :value="status.progress" color="green"
                      :style="{ marginRight: '8px'}"
                    >
                    </v-progress-circular>
                    <v-btn
                      aria-label="Cancel"
                      icon
                      flat
                      color="red"
                      @click="cancelFile(status)"
                      v-if="status.uploading">
                      <v-icon color="red">fa-ban</v-icon>
                    </v-btn>
                  </div>
                </v-list-tile-action>
              </v-list-tile>
              <v-divider></v-divider>
            </div>
          </template>
        </v-list>
      </div>
    </div>
    <div v-if="userError">
      <p>{{ userError }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import VueDropzone from "vue2-dropzone";
import "vue2-dropzone/dist/vue2Dropzone.min.css";
import moment from "moment";
import fb from "@/firebaseApp";
import { getTaskId, validateFlacFile } from "@/utility";

interface IFileStatus {
  progress?: number;
  uploadTask?: any; // upload ref from firebase
  error?: string;
  complete?: boolean;
  uploadStartedAt?: Date;
  uploadRemainingTime?: number;
  uploading?: boolean;
  downloadUrl?: string;
}

@Component({
  name: "SoundEditingUpload",
  components: {
    VueDropzone
  }
})
export default class SoundEditingUpload extends Vue {
  user: any = null;
  userError: any = null;
  files: Map<File, IFileStatus> = new Map();
  totalUploadCount: number = 0;

  $refs!: {
    myDropzone: any;
  };

  dropzoneOptions = {
    previewTemplate: this.template(),
    url: "localhost",
    autoProcessQueue: false,
    uploadMultiple: true
  };

  mounted() {
    this.getUser();
  }

  getFile(file: File): IFileStatus {
    return this.files.get(file) || {};
  }

  getFiles() {
    return Array.from(this.files);
  }

  deleteFile(file: File) {
    this.files.delete(file);
    this.$forceUpdate();
  }

  updateFileStatus(file: File, path: any, value: any) {
    this.updateFileFields(file, { [path]: value });
  }

  updateFileFields(file: File, obj: IFileStatus) {
    const selectedFile = this.getFile(file);
    const newFile = { ...selectedFile, ...obj };
    if (typeof obj.uploading === "boolean") {
      this.totalUploadCount += obj.uploading ? 1 : -1;
    }
    this.files.set(file, newFile);
    this.$forceUpdate();
  }

  cancelFile({ uploadTask }: IFileStatus = {}) {
    uploadTask && uploadTask.cancel();
  }

  cancelAllFiles() {
    this.files.forEach(status => {
      this.cancelFile(status);
    });
  }

  getUser() {
    const {
      params: { uploadCode }
    } = this.$route;
    this.$bindAsArray(
      "user",
      fb
        .database()
        .ref("users")
        .orderByChild("uploadCode")
        .equalTo(uploadCode),
      null,
      () => {
        if (this.user.length) {
          this.user = this.user[0];
        } else {
          this.user = null;
          this.userError = "Can't find user with upload code";
        }
      }
    );
  }

  async getTask(file: File) {
    const taskId = getTaskId(file.name);
    if (taskId) {
      const list = taskId.split("-")[0];
      const snapshot = await fb
        .database()
        .ref(`sound-editing/tasks/${list}/${taskId}`)
        .orderByChild("assignee/emailAddress")
        .equalTo(this.user.emailAddress)
        .once("value");
      const response = snapshot.val();
      if (!response) {
        this.emitFileError(file, "Task must be assigned to user");
      } else if (response.restoration.status === "Done") {
        this.emitFileError(file, "Task is marked as done");
      } else {
        this.uploadFile(`sound-editing/restored/${list}/${taskId}.flac`, file);
      }
    }
  }

  filesAdded(selectedFiles: File | FileList) {
    // when a file is selected by clicking the box "selectedFiles" is an object
    // when files are dropped selectedFiles is an array
    setTimeout(() => this.$refs.myDropzone.removeAllFiles(), 100);
    let files = Array.isArray(selectedFiles)
      ? selectedFiles
      : Object.values(selectedFiles);
    files.forEach(file => {
      this.files.set(file, {});
      try {
        validateFlacFile(file);
        this.getTask(file);
      } catch (e) {
        this.emitFileError(file, e.message);
      }
    });
  }

  emitFileError(file: File, message: string) {
    this.updateFileStatus(file, "error", message);
  }

  getTotalUploadTime() {
    let totalUploadTime = 0;
    this.files.forEach(({ uploadRemainingTime: uploadTime = 0 }) => {
      totalUploadTime += uploadTime === Infinity ? 0 : uploadTime;
    });
    return totalUploadTime < 60
      ? "Less than a minute left"
      : moment.duration(totalUploadTime, "seconds").humanize();
  }

  uploadFile(path: string, file: File) {
    const metadata = {
      customMetadata: {
        fullName: file.name
      }
    };
    const uploadTask = fb
      .storage()
      .ref()
      .child(path)
      .put(file, metadata);
    this.updateFileFields(file, {
      uploading: true,
      uploadTask: uploadTask,
      uploadStartedAt: new Date()
    });
    uploadTask.on(
      "state_changed",
      ({ bytesTransferred, totalBytes }: any) => {
        const { uploadStartedAt } = this.getFile(file);
        const startedAt = uploadStartedAt ? uploadStartedAt.getTime() : 0;
        const secondsElapsed = (new Date().getTime() - startedAt) / 1000;
        const bytesPerSecond = secondsElapsed
          ? bytesTransferred / secondsElapsed
          : 0;
        const remainingBytes = totalBytes - bytesTransferred;
        const progress = (bytesTransferred / totalBytes) * 100;
        this.updateFileFields(file, {
          progress: Math.round(progress),
          uploadRemainingTime: secondsElapsed
            ? remainingBytes / bytesPerSecond
            : 0
        });
      },
      (error: any) => {
        if (error.code === "storage/canceled") {
          this.updateFileFields(file, {
            error: "Canceled upload",
            complete: false,
            uploading: false
          });
        } else {
          this.emitFileError(file, error.message);
        }
      },
      async () => {
        const response = await uploadTask.snapshot.ref.getDownloadURL();
        this.updateFileFields(file, {
          complete: true,
          downloadUrl: response,
          uploading: false
        });
      }
    );
  }

  template() {
    return `<div class="dz-preview dz-file-preview fileWrapper">
                <div class="dz-image">
                    <div data-dz-thumbnail-bg></div>
                </div>
                <div class="dz-details">
                    <div class="dz-size"><span data-dz-size></span></div>
                    <div class="dz-filename"><span data-dz-name></span></div>
                </div>
                <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
                <div class="dz-error-message"><span data-dz-errormessage></span></div>
                <div class="dz-success-mark"><i class="fa fa-check"></i></div>
                <div class="dz-error-mark"><i class="fa fa-close"></i></div>
            </div>
        `;
  }
}
</script>

<style scoped>
>>> .dropzone .fileWrapper {
  display: none;
}
</style>
