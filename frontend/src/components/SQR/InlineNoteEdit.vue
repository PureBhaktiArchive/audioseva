<template>
  <div>
    <v-edit-dialog      
      :return-value.sync="item.notes"
      lazy
      large
      @save="$listeners.save(item, editPath, item.notes)"
      @cancel="$listeners.cancel"
      @open="open"
    > <span :style="{padding: '4px'}">{{ item.notes }}</span>
      <v-textarea
        slot="input"
        ref="editFolloUp"
        v-model="item.notes"
        label="Edit notes"
        single-line
        counter
      ></v-textarea>
    </v-edit-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "InlineNoteEdit"
})
export default class InlineNoteEdit extends Vue {
  @Prop({ default: () => ({}) })
  item!: any;
  @Prop() value!: any;
  
  get editPath() {
    return `/${this.item[".key"]}/notes`;
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editFolloUp as any).focus();
    }, 100);    
  }
}
</script>

<style scoped>
</style>
