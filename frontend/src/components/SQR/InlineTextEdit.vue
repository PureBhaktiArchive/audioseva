<template>
  <div>
    <v-edit-dialog      
      :return-value.sync="followUp"
      lazy
      large
      @save="$listeners.save(item, editPath, followUp)"
      @cancel="$listeners.cancel"
      @open="open"
    > <span :style="{padding: '4px'}">{{ item.soundQualityReporting && item.soundQualityReporting.followUp }}</span>
      <v-textarea
        v-if="isShowTextArea == true"
        slot="input"
        ref="editFolloUp"
        v-model="followUp"
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

  isShowTextArea: boolean = false;
  followUp: string = "";
  
  get editPath() {
    return `/${this.item[".key"]}/soundQualityReporting/followUp`;
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editFolloUp as any).focus();
    }, 100);    
   
    this.followUp = this.item && this.item.soundQualityReporting && this.item.soundQualityReporting.followUp ? this.item.soundQualityReporting.followUp : "";
    this.isShowTextArea = true;
  }
}
</script>

<style scoped>
</style>
