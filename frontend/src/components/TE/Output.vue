<template>
  <div class="d-flex" :style="{ alignItems: 'center' }">
    <a download :href="item.trackEditing.outputFileLink">
      Download
    </a>
    <span>{{ timestamp }}</span>
    <template v-if="item.trackEditing.status === 'Submitted'">
      <inline-text-edit
        @cancel="cancel"
        @save="decline"
      >
        <slot>
          <v-btn color="error" small>Cancel</v-btn>
        </slot>
      </inline-text-edit>
      <v-btn color="success" small @click="accept">accept</v-btn>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { formatTimestamp } from "@/utility";
import InlineTextEdit from "@/components/InlineTextEdit.vue";

@Component({
  name: "Output",
  components: { InlineTextEdit }
})
export default class Output extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;

  textArea = "";

  get timestamp() {
    return formatTimestamp("trackEditing.feedbackTimestamp", this.item);
  }

  cancel() {}

  decline(item: any, path: any, value: any) {
    this.$emit(
      "multiSave",
      this.item,
      "trackEditing",
      {
        feedback: value,
        status: "Revise"
      },
      {
        trackEditing: {
          feedback: value,
          status: "Revise"
        }
      }
    );
  }

  accept() {
    this.$emit("save", this.item, { itemPath: "trackEditing/status" }, "Done", {
      itemPath: "trackEditing.status",
      newValue: "Done"
    });
  }
}
</script>

<style scoped>
</style>
