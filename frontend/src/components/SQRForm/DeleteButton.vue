<template>
  <v-icon v-text="'$vuetify.icons.delete'" color="error" v-bind="buttonProps" @click="handleDelete"></v-icon>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "DeleteButton"
})
export default class Button extends Vue {
  @Prop() buttonProps!: any;
  @Prop() item!: any;
  @Prop() updatePath!: string;
  @Prop() removeField!: any;
  @Prop() value!: any;

  handleDelete() {
    this.removeField(`${this.updatePath}.${this.item}`);
  }
}
</script>

<style scoped>
</style>
