<template>
  <div :style="{ paddingTop: '4px' }" v-if="item.versions">
    <div class="pb-2">
      <v-avatar color="blue" size="26">
        <v-icon size="14" class="white--text">
          {{ $vuetify.icons.values.upload }}
        </v-icon>
      </v-avatar>
      <version-download-link :taskId="item['.key']" :versionId="lastVersion.id">
        Version {{ versionNumber }}
      </version-download-link>
    </div>
    <p class="subtext">{{ timestamp }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from "vue-property-decorator";
import LastVersionMixin from "@/components/TE/LastVersionMixin";
import FormatTime from "@/mixins/FormatTime";
import VersionDownloadLink from "@/components/TE/VersionDownloadLink.vue";

@Component({
  name: "Output",
  components: { VersionDownloadLink },
})
export default class Output extends Mixins<LastVersionMixin, FormatTime>(
  LastVersionMixin,
  FormatTime
) {
  @Prop() item!: any;
  @Prop() value!: string;

  get timestamp() {
    return this.formatTimestamp(this.lastVersion.timestamp);
  }

  get versionNumber() {
    return this.getVersionsCount(this.item);
  }
}
</script>

<style scoped></style>
