<template>
  <v-menu
    v-if="item.restoration && item.restoration.assignee && item.restoration.assignee.name"
    offset-y
    :style="{ height: '100%', width: '100%' }"
  >
    <p class="ma-0 text-no-wrap" slot="activator">
      <span>{{item.restoration.assignee.name}}</span>
      <br>
      <span
        :style="{ fontSize: 'smaller',color: '#A9A9A9' }"
      >{{item.restoration.assignee.emailAddress}}</span>
    </p>
    <div>
       <v-card>         
          <v-list>
            <v-list-tile>              
              <v-list-tile-title>Are you sure you want to cancel allotment?</v-list-tile-title>
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
import moment from "moment";
import _ from "lodash";

@Component({
  name: "InlineAssignEdit"
})
export default class InlineAssignEdit extends Vue {
  @Prop() item!: any;
  @Prop() value!: string;

  handleChange() {
    const { item } = this;
    let changedData = {
      status: "",
      timestampGiven: "",
      assignee: {
        emailAddress: "",
        name: ""
      }
    };
    let update = _.merge({}, item.restoration, changedData);
    let path = `/${item[".key"]}/restoration`;
    this.$emit("save", item, path, update);
  }
}
</script>

<style scoped>
</style>
