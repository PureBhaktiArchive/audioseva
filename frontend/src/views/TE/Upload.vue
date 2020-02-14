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
          <v-btn v-if="completedCount" @click="clearCompletedFiles">
            Clear completed
          </v-btn>
          <v-btn class="ml-2" v-if="totalUploadCount" @click="cancelAllFiles"
            >Cancel all</v-btn
          >
        </div>
      </div>
      <v-divider v-if="getFiles().length"></v-divider>
      <upload-files
        @delete-file="deleteFile"
        @cancel-file="cancelFile(...arguments)"
        @cancel-queued-file="cancelQueueFile"
        :completedFiles="completedFiles"
        :queuedFiles="queue"
        :uploadingFiles="getFiles()"
      >
      </upload-files>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from "vue-property-decorator";
import { mapState } from "vuex";
import * as Spark from "spark-md5";
import _ from "lodash";
import VueDropzone from "vue2-dropzone";
import "vue2-dropzone/dist/vue2Dropzone.min.css";
import moment from "moment";
import Promise from "bluebird";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import BaseTaskMixin from "@/components/TE/BaseTaskMixin";
import UploadFileList from "@/components/TE/UploadFileList.vue";

import { getTaskId, getProjectDomain } from "@/utility";
import UploadFiles from "@/components/TE/UploadFilesList.vue";

Promise.config({ cancellation: true });

interface IFileStatus {
  progress?: number;
  uploadTask?: any; // upload ref from firebase
  error?: string;
  uploadStartedAt?: Date;
  uploadRemainingTime?: number;
  uploading?: boolean;
  downloadUrl?: string;
  retrying?: boolean;
  retryTimer?: Promise<any>;
  retryDuration?: number;
  retryAttempts?: number;
}

@Component({
  name: "Upload",
  components: {
    UploadFiles,
    VueDropzone,
    FileList: UploadFileList
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
  uploadsBucket = firebase.app().storage(`te.uploads.${getProjectDomain()}`);
  queue: File[] = [];
  completedFiles: File[] = [];
  uploadLimit = 3;
  maxRetryAttempts = 5;

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

  cancelFile(
    { uploadTask, retrying, retryTimer }: IFileStatus = {},
    file: File
  ) {
    if (retrying) {
      retryTimer && retryTimer.cancel();
      this.emitFileError(file, "Canceled upload");
      return;
    }
    uploadTask && uploadTask.cancel();
  }

  cancelQueueFile(index: number) {
    this.$delete(this.queue, index);
  }

  cancelAllFiles() {
    this.files.forEach((status, file) => {
      this.cancelFile(status, file);
    });
  }

  clearCompletedFiles() {
    this.completedFiles = [];
  }

  async handleFile(file: File, timestamp: number) {
    const taskId = getTaskId(file.name);
    if (taskId) {
      this.uploadFile(
        `${this.currentUser.uid}/${timestamp}/${taskId}.${file.name
          .split(".")
          .pop()}`,
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
    const taskId = getTaskId(file.name);

    if (!taskId) throw new Error("The file name is not a correct task ID");

    if (file.type !== `audio/${taskId.startsWith("DIGI") ? "mpeg" : "flac"}`) {
      throw new Error(
        `File type must be ${taskId.startsWith("DIGI") ? "MP3" : "FLAC"}`
      );
    }
    const taskSnapshot = await firebase
      .database()
      .ref(`/TE/tasks/${taskId}`)
      .once("value")
      .catch(() => "error");
    if (typeof taskSnapshot === "string") {
      throw new Error(
        `The task ${taskId} does not exist or is not assigned to you.`
      );
    }
    const task = taskSnapshot.val();
    if (!task) {
      throw new Error(`The task ${taskId} does not exist.`);
    }
    if (task.status === "Done") {
      throw new Error(
        `The task ${taskId} is marked as Done. Uploads are not allowed.`
      );
    }
    if (!task.versions) return;
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
    const fileHash = await this.getFileHash(file);
    const versions = Object.values<any>(task.versions);
    for (const i in versions) {
      const version = versions[i];
      const ref = this.uploadsBucket.ref().child(version.uploadPath);
      const metadata = await ref.getMetadata().catch(e => "error");
      if (metadata === "error") continue;
      if (fileHash === metadata.md5Hash) {
        throw new Error(
          `You had uploaded the same file earlier. Version: ${parseInt(i) +
            1} on ${moment(version.timestamp)
            .local()
            .format("LLL")}`
        );
      }
    }
  }

  filesAdded(selectedFiles: File[] | FileList) {
    // when a file is selected by clicking the box "selectedFiles" is an object
    // when files are dropped selectedFiles is an array
    setTimeout(() => this.$refs.myDropzone.removeAllFiles(), 100);
    const timestamp = new Date().valueOf();
    let files = Array.isArray(selectedFiles)
      ? [...selectedFiles]
      : Object.values(selectedFiles);
    const filesToUpload = files.splice(
      0,
      this.uploadLimit - this.totalUploadCount
    );
    this.queue.push(...files);
    for (const file of filesToUpload) {
      this.updateFileFields(file, { uploading: true });
      this.validateFile(file)
        .then(() => this.handleFile(file, timestamp))
        .catch(e => this.emitFileError(file, e.message));
    }
  }

  emitFileError(file: File, message: string) {
    this.updateFileFields(file, { error: message, uploading: false });
  }

  @Watch("totalUploadCount")
  uploadNextFile(newVal: number) {
    if (newVal >= this.uploadLimit) return;
    const queuedFile = this.queue.pop();
    if (queuedFile) {
      this.filesAdded([queuedFile]);
    }
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

  backOff(delay: number) {
    return new Promise((resolve, reject, onCancel) => {
      const timer = setTimeout(resolve, delay);
      onCancel &&
        onCancel(() => {
          clearTimeout(timer);
        });
    });
  }

  uploadFile(path: string, file: File) {
    const uploadTask = this.uploadsBucket
      .ref()
      .child(path)
      .put(file);
    this.updateFileFields(file, {
      uploadTask: uploadTask,
      uploadStartedAt: new Date(),
      retrying: false
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
      async (error: any) => {
        if (error.code === "storage/retry-limit-exceeded") {
          const { retryAttempts = 0, retryDuration = 1000 } = this.getFile(
            file
          );
          if (retryAttempts < this.maxRetryAttempts) {
            const retry = this.backOff(retryDuration);
            this.updateFileFields(file, {
              retryAttempts: retryAttempts + 1,
              retryDuration: retryDuration * 2,
              retryTimer: retry,
              retrying: true
            });
            await retry;
            this.uploadFile(path, file);
          } else {
            this.emitFileError(file, "Max retry limit has been reached.");
          }
          return;
        }
        if (error.code === "storage/canceled") {
          this.emitFileError(file, "Canceled upload");
        } else if (error.code === "storage/unauthorized") {
          this.emitFileError(
            file,
            "You are not authorized to upload this file"
          );
        } else {
          this.emitFileError(file, error.message);
        }
      },
      () => {
        this.totalUploadCount -= 1;
        this.completedFiles.push(file);
        this.files.delete(file);
        this.$forceUpdate();
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

  get completedCount() {
    return this.completedFiles.length;
  }
}
</script>

<style scoped>
>>> .dropzone .fileWrapper {
  display: none;
}
</style>
