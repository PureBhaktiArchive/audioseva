<template>
  <v-menu offset-y :style="{ height: '100%', width: '100%', display: 'inherit' }">
    <p
      class="ma-0 text-no-wrap"
      slot="activator"
      :style="{ height: '25px', width: '40px' }"
    >{{ status }}</p>
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
import _ from "lodash";

@Component({
  name: "InlineStatusEdit"
})
export default class InlineStatusEdit extends Vue {
  @Prop() item!: any;
  @Prop() statusItems!: string[];
  @Prop() keyPath!: string;
  @Prop() value!: string;

  get status() {
    return _.get(this.item, this.value);
  }

  handleChange(e: string) {
    const { item } = this;

    //Object that is use in making of firebase path URL to save data in database.
    const path: any = {};
    path["itemPath"] = this.value ? this.value.split(".").join("/"): "";
    this.$emit("save", item, path, e, { newValue: e, itemPath: this.value });
  }
}
</script>

<style scoped>
.v-menu__activator {
  height: 100%;
  width: 100%;
}
</style>
