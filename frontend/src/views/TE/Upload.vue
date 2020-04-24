<template>
  <div class="height-100">
    <h2>{{ $title }}</h2>
    <full-screen-file-drop @drop="onDrop"></full-screen-file-drop>
    <vue-dropzone
      v-if="!files.size"
      class="height-100"
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
    <div v-if="files.size">
      <div
        :style="{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }"
        class="d-flex pa-2"
      >
        <div></div>
        <div
          :style="{
            justifyContent: 'flex-end',
            display: 'flex',
          }"
          class="pl-2"
        >
          <v-btn :disabled="!totalUploadCount" @click="cancelAllFiles"
            >Cancel all</v-btn
          >
          <v-btn
            class="ml-2"
            :disabled="!completedCount"
            @click="clearCompletedFiles"
          >
            Clear completed
          </v-btn>
        </div>
      </div>
      <v-divider v-if="files.size"></v-divider>
      <upload-file-list
        :files="getFiles()"
        @cancel-file="cancelFile"
        @delete-file="deleteFile"
        @retry-file="retryFile"
        v-if="files.size"
      >
      </upload-file-list>
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
import FullScreenFileDrop from "vue-full-screen-file-drop";
import moment from "moment";
import Promise from "bluebird";
import firebase from "firebase/app";
import "firebase/database";
import "firebase/storage";
import Pqueue from "p-queue";
import BaseTaskMixin from "@/components/TE/BaseTaskMixin";
import UploadFileList from "@/components/TE/UploadFileList.vue";

import { getTaskId, getProjectDomain } from "@/utility";

Promise.config({ cancellation: true });

interface IFileStatus {
  progress?: number;
  uploadTask?: any; // upload ref from firebase
  error?: string;
  uploadStartedAt?: Date;
  uploadRemainingTime?: number;
  downloadUrl?: string;
  state?: "uploading" | "completed" | "queued";
  canceled?: boolean;
  timestamp?: number;
  retry?: boolean;
}

const sortOrder = {
  uploading: 0,
  queued: 1,
  completed: 2,
};

@Component({
  name: "Upload",
  components: {
    VueDropzone,
    UploadFileList,
    FullScreenFileDrop,
  },
  computed: {
    ...mapState("user", ["currentUser"]),
  },
  title: "Track Editing Upload",
})
export default class Upload extends Mixins<BaseTaskMixin>(BaseTaskMixin) {
  user: any = null;
  currentUser!: firebase.User;
  files: Map<File, IFileStatus> = new Map();
  totalUploadCount: number = 0;
  completedCount = 0;
  uploadsBucket = firebase.app().storage(`te.uploads.${getProjectDomain()}`);
  pQueue = new Pqueue({ concurrency: 3 });
  maxRetryAttempts = 5;

  $refs!: {
    myDropzone: any;
  };

  dropzoneOptions = {
    previewTemplate: this.template(),
    url: "localhost",
    autoProcessQueue: false,
    acceptedFiles: ".mp3,.flac",
    uploadMultiple: true,
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
    if (selectedFile.state !== newFile.state) {
      newFile.timestamp = new Date().valueOf();
    }
    this.files.set(file, newFile);
    this.$forceUpdate();
  }

  onDrop(formData: any, fileList: FileList) {
    this.filesAdded(
      [...fileList].map((file) => {
        _.set(file, "upload.uuid", _.uniqueId());
        return file;
      })
    );
  }

  cancelFile({ uploadTask, retry, state }: IFileStatus = {}, file: File) {
    this.updateFileFields(file, { canceled: true });
    if (retry || state === "queued") {
      this.emitFileError(file, "Canceled upload");
      return;
    }
    uploadTask && uploadTask.cancel();
  }

  cancelAllFiles() {
    this.files.forEach((status, file) => {
      this.cancelFile(status, file);
    });
  }

  clearCompletedFiles() {
    for (let [file, status] of this.files) {
      if (status.state === "completed") {
        this.files.delete(file);
      }
    }
    this.completedCount = 0;
  }

  async handleFile(file: File, timestamp: number) {
    const taskId = getTaskId(file.name);
    if (taskId) {
      this.pQueue
        .add(() =>
          this.uploadFile(
            `${this.currentUser.uid}/${timestamp}/${taskId}.${file.name
              .split(".")
              .pop()}`,
            file
          )
        )
        .catch((e) => {
          this.emitFileError(file, e.message);
        });
    }
  }

  getFileHash(file: File) {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = function (event: any) {
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

    if (!file.type.startsWith("audio/"))
      throw new Error("File is not an audio file.");

    if (
      !file.name
        .toUpperCase()
        .endsWith(taskId.startsWith("DIGI") ? ".MP3" : ".FLAC")
    )
      throw new Error(
        `File type must be ${taskId.startsWith("DIGI") ? "MP3" : "FLAC"}`
      );

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
      const metadata = await ref.getMetadata().catch((e) => "error");
      if (metadata === "error") continue;
      if (fileHash === metadata.md5Hash) {
        throw new Error(
          `You had uploaded the same file earlier. Version: ${
            parseInt(i) + 1
          } on ${moment(version.timestamp).local().format("LLL")}`
        );
      }
    }
  }

  filesAdded(selectedFiles: File[] | FileList) {
    // when a file is selected by clicking the box "selectedFiles" is an object
    // when files are dropped selectedFiles is an array
    setTimeout(() => {
      if (this.$refs.myDropzone) {
        this.$refs.myDropzone.removeAllFiles();
      }
    }, 100);
    const timestamp = new Date().valueOf();
    let files = Array.isArray(selectedFiles)
      ? [...selectedFiles]
      : Object.values(selectedFiles);
    for (const file of files) {
      this.updateFileFields(file, {
        state: "queued",
      });
      this.validateFile(file)
        .then(() => this.handleFile(file, timestamp))
        .catch((e) => this.emitFileError(file, e.message));
    }
  }

  emitFileError(file: File, message: string) {
    this.updateFileFields(file, { error: message });
  }

  retryFile(file: File) {
    this.updateFileFields(file, { retry: false, error: "" });
    this.handleFile(file, new Date().valueOf());
  }

  uploadFile(path: string, file: File) {
    return new Promise((resolve, reject) => {
      const status = this.getFile(file);
      if (status.canceled || !Object.keys(status).length) {
        resolve();
        return;
      }
      if (!status.retry) {
        this.totalUploadCount += 1;
      }
      const uploadTask = this.uploadsBucket.ref().child(path).put(file);
      this.updateFileFields(file, {
        state: "uploading",
        uploadTask: uploadTask,
        uploadStartedAt: new Date(),
        retry: false,
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
              : 0,
          });
        },
        async (error: any) => {
          this.totalUploadCount -= 1;
          let errorMessage: string;
          switch (error.code) {
            case "storage/canceled":
              errorMessage = "Canceled upload";
              break;
            case "storage/unauthorized":
              errorMessage = "You are not authorized to upload this file";
              break;
            case "storage/retry-limit-exceeded":
              errorMessage = "Max retry limit has been reached.";
              this.updateFileStatus(file, "retry", true);
              break;
            default:
              errorMessage = error.message;
          }
          reject(new Error(errorMessage));
        },
        () => {
          this.updateFileFields(file, { state: "completed" });
          this.totalUploadCount -= 1;
          this.completedCount += 1;
          resolve();
        }
      );
    });
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
.height-100 {
  height: 100%;
}
</style>
