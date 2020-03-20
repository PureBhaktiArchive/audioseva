<template>
  <v-list dense>
    <template v-for="[file, status] in files">
      <v-list-item :key="file.upload.uuid">
        <v-list-item-content>
          <v-list-item-title :style="{ display: 'flex', alignItems: 'center' }">
            {{ file.name }}
            <v-progress-linear
              v-if="
                status.state !== 'completed' &&
                  !status.error &&
                  status.state !== 'queued'
              "
              class="ml-2"
              :value="status.progress"
              color="green"
              height="20"
            >
              <strong>{{ status.progress }}%</strong>
            </v-progress-linear>
          </v-list-item-title>
        </v-list-item-content>

        <v-list-item-action
          :style="{ flexDirection: 'row', alignItems: 'center' }"
        >
          <v-icon
            v-if="status.state === 'completed'"
            color="green"
            class="align-items-center pr-1"
          >
            fa-check-circle
          </v-icon>
          <div v-if="status.error">
            <span
              class="subtext"
              :style="{ color: 'red', alignSelf: 'center' }"
            >
              {{ status.error }}
            </span>
            <v-icon color="red" class="pr-1">
              {{ $vuetify.icons.values.error }}
            </v-icon>
          </div>
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
      <v-divider :key="`divider-${file.upload.uuid}`"></v-divider>
    </template>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import "@/styles/subtext.css";

@Component({
  name: "UploadFileList"
})
export default class UploadFileList extends Vue {
  @Prop() files!: [File, any][];
}
</script>

<style scoped></style>
