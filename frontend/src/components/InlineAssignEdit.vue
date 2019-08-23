<template>
  <v-menu
    v-if="assignee && assignee.name"
    offset-y
    :style="{ height: '100%', width: '100%' }"
  >
    <p class="ma-0 text-no-wrap" slot="activator">
      <span>{{assignee.name}}</span>
      <br>
      <span
        :style="{ fontSize: 'smaller',color: '#A9A9A9' }"
      >{{assignee.emailAddress}}</span>
    </p>
    <div>
      <v-card>
        <v-list>
          <v-list-tile>
            <v-list-tile-title>{{`Are you sure you want to cancel ${item[".key"]} allotment?`}}</v-list-tile-title>
          </v-list-tile>
        </v-list>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" flat @click="handleChange()">Yes</v-btn>
          <v-btn flat>No</v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-menu>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component({
  name: "InlineAssignEdit"
})
export default class InlineAssignEdit extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;
  @Prop({ default: "" })
  keyPath!: string;
  @Prop({ default: false })
  multiFieldSave!: boolean;
  @Prop({ default: () => () => false })
  shouldCancelChange!: (item: any) => boolean;
  @Prop({
    default: () => () => ({
      status: "",
      timestampGiven: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    })
  })
  cancelData!: any;

  handleChange() {
    const { item, shouldCancelChange } = this;

    if (shouldCancelChange(item)) return;

    //Object that is effectively empties only following fields: date given, assignee, email address, status in database.
    const update = _.merge({}, item[this.keyPath], this.cancelData());

    //Object that is use in making of firebase path URL to save data in database.
    const path: any = {};
    path["itemPath"] = this.keyPath;
    if (this.$listeners.multiSave) {
      this._multiFieldSave();
      return;
    }
    this.$emit("save", item, path, update, {
      itemPath: this.keyPath,
      newValue: update
    });
  }

  _multiFieldSave() {
    const cancelData = this.cancelData();
    this.$emit("multiSave", this.item, this.keyPath, cancelData, cancelData);
  }

  get assignee() {
    const keyPath = this.keyPath ? `${this.keyPath}.` : "";
    return _.get(this.item, `${keyPath}assignee`, false);
  }
}
</script>

<style scoped>
</style>
