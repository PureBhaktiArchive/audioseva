<template>
  <div class="d-flex" :style="{ alignItems: 'flex-start', flexDirection: 'column' }">
    <div>
      <a download :href="item.trackEditing.outputFileLink">
        Download
      </a>
      <p class="caption">{{ timestamp }}</p>
    </div>
    <div class="d-flex" v-if="item.trackEditing.status === 'Submitted'">
      <inline-text-edit
        @cancel="cancel"
        @save="decline"
        :item="item"
        :value="'trackEditing.feedback'"
        :textAreaProps="{ label: 'Edit feedback' }"
      >
        <slot>
          <v-btn :style="{ marginLeft: 0 }" icon flat color="error" small>
            <v-icon>{{ $vuetify.icons.undo }}</v-icon>
          </v-btn>
        </slot>
      </inline-text-edit>
      <v-btn icon flat color="success" small @click="accept">
        <v-icon>{{ $vuetify.icons.check }}</v-icon>
      </v-btn>
    </div>
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
