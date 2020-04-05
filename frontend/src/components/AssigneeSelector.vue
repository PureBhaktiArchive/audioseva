<template>
  <v-autocomplete
    label="Select an assignee"
    clearable
    dense
    v-bind="$attrs"
    v-on="$listeners"
    :loading="loading"
  >
    <template v-slot:selection="props">
      <slot name="selection" v-bind="props">{{ props.item.name }}</slot>
    </template>
    <template slot="item" slot-scope="{ item }">
      <template v-if="typeof item !== 'object'">
        <v-list-item-content v-text="item"></v-list-item-content>
      </template>
      <template v-else>
        <v-list-item-content>
          <v-list-item-title v-html="item.name"></v-list-item-title>
          <v-list-item-subtitle
            v-html="item.emailAddress"
          ></v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </template>
    <template v-slot:message>
      <slot name="message"></slot>
    </template>
    <template v-slot:no-data>
      <div class="pa-2" v-if="loading">
        Loading Assignees
      </div>
      <div class="pa-2" v-else>
        No data available
      </div>
    </template>
  </v-autocomplete>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "AssigneeSelector",
})
export default class AssigneeSelector extends Vue {
  @Prop({ default: false }) loading!: boolean;
}
</script>

<style scoped></style>
