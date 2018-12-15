<template>
  <v-edit-dialog
    :return-value.sync="item.notes"
    lazy
    @save="$listeners.save(item, editPath, item.notes)"
    @cancel="$listeners.cancel"
    @open="$listeners.open"
  > {{ item.notes }}
    <v-text-field
      slot="input"
      v-model="item.notes"
      :rules="[max25chars]"
      label="Edit notes"
      single-line
      counter
    ></v-text-field>
  </v-edit-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "InlineTextEdit"
})
export default class InlineTextEdit extends Vue {
  @Prop({ default: () => ({}) })
  item!: any;
  @Prop() value!: any;

  notes: string = "";
  max25chars: any = (v: string) => v.length <= 25 || "Input too long!";

  get editPath() {
    return `users/${this.item[".key"]}/notes`;
  }
}
</script>

<style scoped>
</style>
