<template>
  <div v-if="fileList.length">
    <template v-for="(item, index) in fileList">
      <v-list-item :key="getItemKey(item)">
        <slot name="content" v-bind:file="item" v-bind:index="index">
          <v-list-item-content>
            <v-list-item-title>
              <slot name="title" v-bind:file="item" v-bind:index="index"></slot>
            </v-list-item-title>
          </v-list-item-content>
        </slot>

        <v-list-item-action :style="{ flexDirection: 'row' }">
          <slot name="action" v-bind:file="item" v-bind:index="index"></slot>
        </v-list-item-action>
      </v-list-item>
      <v-divider :key="getItemKey(item, 'divider')"></v-divider>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "UploadFileList"
})
export default class UploadFileList extends Vue {
  @Prop() listPrefix!: string;
  @Prop() fileList!: (any | File)[];
  @Prop() getKey!: (item: any) => string;

  getItemKey(item: any, prefix: string = ":") {
    const key = this.getKey ? this.getKey(item) : item.upload.uuid;

    return `${this.listPrefix}--${prefix ? `${prefix}--` : ""}${key}`;
  }
}
</script>

<style scoped></style>
