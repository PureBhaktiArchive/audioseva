<template>
  <div>
    <h2>{{ $title }}</h2>
    <div>
      <vue-dropzone
        ref="myDropzone"
        id="dropzone"
        :options="dropzoneOptions"
        @vdropzone-files-added="filesAdded"
        :useCustomSlot="true"
      >
        <div>
          <p>
            Drop files here to upload or click here to pick the files from your
            computer.
          </p>
        </div>
      </vue-dropzone>
    </div>
    <div>
      <div
        :style="{ alignItems: 'center', justifyContent: 'space-between' }"
        class="d-flex pa-2"
      >
        <span v-if="totalUploadCount" class="pl-2">
          Uploading
          {{ `${totalUploadCount} item${totalUploadCount > 1 ? "s" : ""}` }} |
          {{ getTotalUploadTime() }}
        </span>
        <div
          :style="{
            justifyContent: 'flex-end',
            display: 'flex',
            width: '100%'
          }"
          class="pl-2"
        >
          <v-btn v-if="completedFileUploads" @click="clearCompletedFiles">
            Clear completed
          </v-btn>
          <v-btn class="ml-2" v-if="totalUploadCount" @click="cancelAllFiles"
            >Cancel all</v-btn
          >
        </div>
      </div>
      <v-divider v-if="getFiles().length"></v-divider>
      <v-list two-line>
        <template v-for="[file, status] in getFiles()">
          <div :key="file.upload.uuid">
            <v-list-item>
              <v-list-item-content>
                <v-list-item-subtitle
                  :style="{ color: 'red' }"
                  v-if="status.error"
                  >{{ status.error }}
                </v-list-item-subtitle>
                <v-list-item-title>{{ file.name }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-action :style="{ flexDirection: 'row' }">
                <v-btn v-if="status.error" @click="deleteFile(file)"
                  >remove</v-btn
                >
                <v-icon color="green" v-else-if="status.complete"
                  >fa-check-circle</v-icon
                >
                <div v-else>
                  <v-progress-circular
                    :value="status.progress"
                    color="green"
                    :style="{ marginRight: '16px' }"
                  ></v-progress-circular>
                  <v-btn @click="cancelFile(status)" v-if="status.uploading">
                    Cancel
                  </v-btn>
                </div>
              </v-list-item-action>
            </v-list-item>
            <v-divider></v-divider>
          </div>
        </template>
      </v-list>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from "vue-property-decorator";
import { mapState } from "vuex";
import * as Spark from "spark-md5";
import _ from "lodash";
import VueDropzone from "vue2-dropzone";
import "vue2-dropzone/dist/vue2Dropzone.min.css";
import moment from "moment";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import BaseTaskMixin from "@/components/TE/BaseTaskMixin";

import { getTaskId, getProjectDomain, flacFileFormat } from "@/utility";

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
  name: "Upload",
  components: {
    VueDropzone
  },
  computed: {
    ...mapState("user", ["currentUser"])
  },
  title: "Track Editing Upload"
})
export default class Upload extends Mixins<BaseTaskMixin>(BaseTaskMixin) {
  user: any = null;
  currentUser!: firebase.User;
  files: Map<File, IFileStatus> = new Map();
  totalUploadCount: number = 0;
  completedFileUploads: number = 0;
  uploadsBucket = firebase.app().storage(`te.uploads.${getProjectDomain()}`);

  $refs!: {
    myDropzone: any;
  };

  dropzoneOptions = {
    previewTemplate: this.template(),
    url: "localhost",
    autoProcessQueue: false,
    uploadMultiple: true
  };

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

  clearCompletedFiles() {
    for (let [file, status] of this.files) {
      if (status.complete) {
        this.files.delete(file);
      }
    }
    this.completedFileUploads = 0;
  }

  async handleFile(file: File, timestamp: number) {
    const taskId = getTaskId(file.name);
    if (taskId) {
      this.uploadFile(
        `${this.currentUser.uid}/${timestamp}/${taskId}.flac`,
        file
      );
    }
  }

  getFileHash(file: File) {
    return new Promise(resolve => {
      const fileReader = new FileReader();
      fileReader.onload = function(event: any) {
        const spark = new Spark.ArrayBuffer();
        spark.append(event.target.result);
        resolve(btoa(spark.end(true)));
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  async validateFile(file: File) {
    if (file.type !== "audio/flac") {
      throw new Error("File type must be flac");
    }
    if (!file.name.match(flacFileFormat)) {
      throw new Error("The file name is not a correct task ID");
    }
    const taskId = getTaskId(file.name);
    const task = (
      await firebase
        .database()
        .ref(`/TE/tasks/${taskId}`)
        .once("value")
    ).val();
    if (task.status === "Done") {
      throw new Error(
        `The task ${taskId} is marked as Done. Uploads are not allowed.`
      );
    }
    const lastVersionResolutionTimestamp = _.get(
      this.getLastVersion(task),
      "resolution.timestamp"
    );
    if (
      lastVersionResolutionTimestamp &&
      lastVersionResolutionTimestamp > file.lastModified
    ) {
      throw new Error("File is older than the latest feedback on the task.");
    }
    if (!task.versions) return;
    const fileHash = await this.getFileHash(file);
    for (const [versionId, version] of Object.entries<any>(task.versions)) {
      const ref = this.uploadsBucket.ref().child(version.uploadPath);
      const metadata = await ref.getMetadata().catch(e => "error");
      if (metadata === "error") continue;
      if (fileHash === metadata.md5Hash) {
        throw new Error(
          `You had uploaded the same file earlier. Version: ${versionId} on ${moment(
            version.timestamp
          )
            .local()
            .format("LLL")}`
        );
      }
    }
  }

  filesAdded(selectedFiles: File | FileList) {
    // when a file is selected by clicking the box "selectedFiles" is an object
    // when files are dropped selectedFiles is an array
    setTimeout(() => this.$refs.myDropzone.removeAllFiles(), 100);
    const timestamp = new Date().valueOf();
    let files = Array.isArray(selectedFiles)
      ? selectedFiles
      : Object.values(selectedFiles);
    for (const file of files) {
      this.updateFileFields(file, {});
      this.validateFile(file)
        .then(() => this.handleFile(file, timestamp))
        .catch(e => this.emitFileError(file, e.message));
    }
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
    const uploadTask = this.uploadsBucket
      .ref()
      .child(path)
      .put(file);
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
        } else if (error.code === "storage/unauthorized") {
          this.updateFileFields(file, {
            error: "You are not authorized to upload this file",
            complete: false,
            uploading: false
          });
        } else {
          this.emitFileError(file, error.message);
        }
      },
      async () => {
        this.completedFileUploads += 1;
        this.updateFileFields(file, {
          complete: true,
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
