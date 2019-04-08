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
      <v-dialog v-model="dialog" width="500">
        <template slot="activator">
          <v-btn icon flat color="success" small>
            <v-icon>{{ $vuetify.icons.check }}</v-icon>
          </v-btn>
        </template>
        <v-card>
          <v-card-title>
            Accept output?
          </v-card-title>
          <v-card-actions>
            <v-btn color="success" small @click="accept">
              Accept
            </v-btn>
            <v-btn color="error" small @click="dialog = false">
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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

  dialog: boolean = false;

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
    this.dialog = false;
    this.$emit("save", this.item, { itemPath: "trackEditing/status" }, "Done", {
      itemPath: "trackEditing.status",
      newValue: "Done"
    });
  }
}
</script>

<style scoped>
</style>
