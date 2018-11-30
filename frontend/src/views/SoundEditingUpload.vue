<template>
  <div>
    <div v-if="user">
      <h2>Hello, {{ user.name }}</h2>
      <div>
        To upload files you can do one of two things
        <ul>
          <li>Drag and drop files to the box below.</li>
          <li>Click the box and manually select files.</li>
        </ul>
      </div>
      <div>
        <vue-dropzone
          ref="myDropzone"
          id="dropzone"
          :options="{ url: 'localhost', autoProcessQueue: false, uploadMultiple: true }"
          @vdropzone-files-added="filesAdded"
        ></vue-dropzone>
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
import fb from "@/firebaseApp";
import { getTaskId, validateFlacFile } from "@/utility";

@Component({
  name: "SoundEditingUpload",
  components: {
    VueDropzone
  }
})
export default class Upload extends Vue {
  user: any = null;
  userError: any = null;

  $refs!: {
    myDropzone: any;
  };

  mounted() {
    this.getUser();
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

  async getTask(file: any) {
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
      if (!response || response.restoration.status === "Done") {
        return "Invalid task";
      }
      this.uploadFile(`sound-editing/restored/${list}/${taskId}.flac`, file);
    }
  }

  filesAdded(selectedFiles: any) {
    // when a file is selected by clicking the box "selectedFiles" is an object
    // when files are dropped selectedFiles is an array
    const files = Array.isArray(selectedFiles)
      ? selectedFiles
      : Object.values(selectedFiles);
    files.forEach((file: any) => {
      try {
        validateFlacFile(file);
        this.getTask(file);
      } catch (e) {
        this.emitFileError(file, e.message);
      }
    });
  }

  emitFileError(file: any, message: string) {
    this.emitDropzone("error", file, message);
    setTimeout(() => this.removeFile(file), 100);
  }

  removeFile(file: any) {
    file.previewElement.addEventListener("click", () => {
      this.$refs.myDropzone.removeFile(file);
    });
  }

  emitDropzone(event: string, ...args: any[]) {
    setTimeout(() => {
      this.$refs.myDropzone.dropzone.emit(event, ...args);
    }, 200);
  }

  uploadFile(path: string, file: any) {
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
    uploadTask.on(
      "state_changed",
      (snapshot: any) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.emitDropzone(
          "uploadprogress",
          file,
          Math.round(progress),
          snapshot.bytesTransferred
        );
      },
      error => {
        this.emitFileError(file, error.message);
      },
      () => {
        this.emitDropzone("success", file);
        this.removeFile(file);
      }
    );
  }
}
</script>

<style scoped>
</style>
