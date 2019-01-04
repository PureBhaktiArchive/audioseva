<template>
  <div>
    <v-edit-dialog      
      :return-value.sync="textAreaValue"
      lazy
      large
      @save="$listeners.save(item, editPath, textAreaValue)"
      @cancel="$listeners.cancel"
      @open="open"
    > <span :style="{padding: '4px'}">{{ item[keyPath] && item[keyPath][value] }}</span>
      <v-textarea
        v-if="isShowTextArea == true"
        slot="input"
        ref="editFolloUp"
        v-model="textAreaValue"
        label="Edit follow up"
        single-line
        counter
      ></v-textarea>
    </v-edit-dialog>
  </div>
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
  @Prop() keyPath!: string;
  
  isShowTextArea: boolean = false;
  textAreaValue: string = "";
  
  get editPath() {
    return `/${this.item[".key"]}/${this.keyPath}/${this.value}`;
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editFolloUp as any).focus();
    }, 100);    
   
    this.textAreaValue = this.item && this.item[this.keyPath] && this.item[this.keyPath][this.value] ? this.item[this.keyPath][this.value] : "";
    this.isShowTextArea = true;
  }
}
</script>

<style scoped>
</style>
