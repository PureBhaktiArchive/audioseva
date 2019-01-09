<template>
  <div>
    <v-edit-dialog      
      :return-value.sync="textAreaValue"
      lazy
      large
      @save="$listeners.save(item, editPath, textAreaValue)"
      @cancel="$listeners.cancel"
      @open="open"
    > <span :style="{padding: '4px'}">{{ textArea }}</span>
      <v-textarea
        v-if="isShowTextArea == true"
        slot="input"
        ref="editTextArea"
        v-model="textAreaValue"
        label="Edit here..."
        single-line
        counter
      ></v-textarea>
    </v-edit-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { findObjectValue } from "@/utility";

@Component({
  name: "InlineTextEdit"
})
export default class InlineTextEdit extends Vue {
  @Prop({ default: () => ({}) })
  item!: any;
  @Prop() value!: any;
  @Prop() keyPath!: string;

  isShowTextArea: boolean = false;
  textAreaValue: string = "";

  get editPath() {
    let path: any = {};
    path["keyPathId"] = this.item[".key"] ? this.item[".key"] : "";
    path["keyPath"] = this.keyPath ? this.keyPath : "";
    path["itemPath"] = this.value;
    return path;
  }

  get textArea() {
    return findObjectValue(this.item, this.value);
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editTextArea as any).focus();
    }, 100);

    this.textAreaValue = findObjectValue(this.item, this.value);
    this.isShowTextArea = true;
  }
}
</script>

<style scoped>
</style>
