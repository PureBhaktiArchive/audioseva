<template>
  <v-edit-dialog
    :return-value.sync="item.notes"
    lazy
    large
    @save="$listeners.save(item, editPath, item.notes)"
    @cancel="$listeners.cancel"
    @open="open"
  > {{ item.notes }}
    <v-textarea
      slot="input"
      ref="editNotes"
      v-model="item.notes"
      label="Edit notes"
      single-line
      counter
    ></v-textarea>
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

  get editPath() {
    return `users/${this.item[".key"]}/notes`;
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editNotes as any).focus();
    }, 100);
  }
}
</script>

<style scoped>
</style>
