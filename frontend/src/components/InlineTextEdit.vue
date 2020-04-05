<template>
  <div>
    <v-edit-dialog
      :return-value.sync="textAreaValue"
      lazy
      large
      @save="
        $listeners.save(item, editPath, textAreaValue, {
          itemPath: value,
          newValue: textAreaValue,
        })
      "
      @cancel="$listeners.cancel"
      @open="open"
    >
      <slot>
        <span :style="{ padding: '4px' }">{{ textArea }}</span>
      </slot>
      <v-textarea
        v-if="isShowTextArea == true"
        slot="input"
        ref="editTextArea"
        v-model="textAreaValue"
        v-bind="textProps"
      ></v-textarea>
    </v-edit-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component({
  name: "InlineTextEdit",
})
export default class InlineTextEdit extends Vue {
  @Prop({ default: () => ({}) })
  item!: any;
  @Prop() value!: any;
  @Prop() keyPath!: string;
  @Prop({ default: () => ({}) })
  textAreaProps!: { [key: string]: any };

  isShowTextArea: boolean = false;
  textAreaValue: any = "";

  defaultTextProps: any = { label: "Edit here...", counter: true };

  get editPath() {
    //Object that is use in making of firebase path URL to save data in database.
    const path: any = {};
    path["itemPath"] = this.value ? this.value.split(".").join("/") : "";
    return path;
  }

  get textArea() {
    return _.get(this.item, this.value);
  }

  open() {
    // wait small amount of time so focus works
    setTimeout(() => {
      (this.$refs.editTextArea as any).focus();
    }, 100);

    this.textAreaValue = _.get(this.item, this.value, "");
    this.isShowTextArea = true;
  }

  get textProps() {
    return { ...this.defaultTextProps, ...this.textAreaProps };
  }
}
</script>

<style scoped></style>
