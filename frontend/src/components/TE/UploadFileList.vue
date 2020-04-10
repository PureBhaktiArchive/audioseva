<template>
  <v-list dense>
    <template v-for="[file, status] in files">
      <v-list-item :key="file.upload.uuid">
        <v-list-item-content>
          <v-list-item-title :style="{ display: 'flex', alignItems: 'center' }">
            <v-icon
              :style="{ width: '30px' }"
              :color="color(status)"
              class="align-items-center mr-2"
            >
              {{ icon(status) }}
            </v-icon>
            <span>{{ file.name }}</span>
            <v-progress-linear
              rounded
              class="ml-4"
              :value="status.progress"
              :color="color(status)"
              height="20"
            >
              <strong>
                {{ status.error ? status.error : `${status.progress || 0}%` }}
              </strong>
            </v-progress-linear>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action
          :style="{ flexDirection: 'row', alignItems: 'center' }"
        >
          <v-btn
            v-if="status.retry"
            text
            icon
            @click="$emit('retry-file', file)"
          >
            <v-icon dark>{{ $vuetify.icons.values.retry }}</v-icon>
          </v-btn>
          <v-btn
            v-else-if="status.error || status.state === 'completed'"
            text
            icon
            @click="$emit('delete-file', file)"
          >
            <v-icon dark>{{ $vuetify.icons.values.delete }}</v-icon>
          </v-btn>
          <div v-else>
            <v-btn text icon @click="$emit('cancel-file', status, file)">
              <v-icon>{{ $vuetify.icons.values.cancel }}</v-icon>
            </v-btn>
          </div>
        </v-list-item-action>
      </v-list-item>
    </template>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import "@/styles/subtext.css";
import { VuetifyIconComponent } from "vuetify/types/services/icons";

@Component({
  name: "UploadFileList"
})
export default class UploadFileList extends Vue {
  @Prop() files!: [File, any][];

  icon(status: any) {
    let fileIcon: string | VuetifyIconComponent = "";
    if (status.error) {
      fileIcon = this.$vuetify.icons.values.error;
    } else if (status.state === "completed") {
      fileIcon = "fa-check-circle";
    } else if (
      status.state === "uploading" ||
      status.retry ||
      status.state === "queued"
    ) {
      fileIcon = this.$vuetify.icons.values.upload;
    }
    return fileIcon;
  }

  color(status: any) {
    let iconColor = "blue";
    if (status.retry) iconColor = "yellow";
    else if (status.state === "queued") iconColor = "light-blue";
    else if (status.state === "completed") iconColor = "green";
    else if (status.error) iconColor = "red";
    return iconColor;
  }
}
</script>

<style scoped></style>
