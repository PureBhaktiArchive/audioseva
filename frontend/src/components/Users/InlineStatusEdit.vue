<template>
  <v-menu offset-y>
    <p class="ma-0 text-no-wrap" slot="activator">
      {{ item.status }}
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

@Component({
  name: "InlineStatusEdit"
})
export default class InlineStatusEdit extends Vue {
  @Prop() item!: any;
  statusItems = ["Empty", "Opted out", "Lost", "Duplicate", "Incorrect"];

  handleChange(e: string) {
    const { item } = this;
    const path = `users/${item[".key"]}/status`;
    this.$emit("save", item, path, e, { newValue: e, itemPath: "status" });
  }
}
</script>

<style scoped>
</style>
