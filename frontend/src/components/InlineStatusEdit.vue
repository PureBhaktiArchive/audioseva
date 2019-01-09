<template>
  <v-menu offset-y :style="{ height: '100%', width: '100%', display: 'inherit' }">
    <p class="ma-0 text-no-wrap" slot="activator" :style="{ height: '25px', width: '40px' }">
      {{ status }}  
    </p>
    <div>
      <v-list>
        <v-list-tile @click="handleChange(item)" v-for="(item, index) in statusItems" :key="index">
          <v-list-tile-title>{{ item }}</v-list-tile-title>
        </v-list-tile>
      </v-list>
    </div>
  </v-menu>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { findObjectValue } from "@/utility";

@Component({
  name: "InlineStatusEdit"
})
export default class InlineStatusEdit extends Vue {
  @Prop() item!: any;
  @Prop() statusItems!: string[];
  @Prop() keyPath!: string;

  get status() {
    const { item } = this;
    return findObjectValue(item, "status");
  }

  handleChange(e: string) {
    const { item } = this;
    let path: any = {};
    path["keyPathId"] = item[".key"] ? item[".key"] : "";
    path["keyPath"] = this.keyPath ? this.keyPath : "";
    path["itemPath"] = "status";
    this.$emit("save", item, path, e, { newValue: e, itemPath: "status" });
  }
}
</script>

<style scoped>
.v-menu__activator {
  height: 100%;
  width: 100%;
}
</style>
