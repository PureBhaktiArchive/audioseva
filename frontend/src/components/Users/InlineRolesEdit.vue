<template>
  <v-menu
    :style="{
      maxWidth: '170px',
      width: `${Object.keys(itemRoles).length * 50}px`,
      height: '100%',
    }"
    :close-on-content-click="false"
  >
    <div slot="activator">
      <v-chip
        small
        v-for="(role, index) in Object.keys(itemRoles)"
        :key="`${index}-${role}-chip`"
        >{{ getRoleDisplayValue(role) }}</v-chip
      >
    </div>
    <v-list v-for="(role, index) in roles" :key="index">
      <v-list-item>
        <v-list-item-action>
          <v-switch
            @change="handleChange($event, role)"
            :label="getRoleDisplayValue(role)"
            :input-value="itemRoles[role]"
          ></v-switch>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component({
  name: "InlineRolesEdit",
})
export default class InlineRolesEdit extends Vue {
  @Prop() item!: any;
  @Prop() roles!: string[];
  @Prop() value!: any;

  handleChange(e: any, role: string) {
    const { item } = this;

    //Object that is use in making of firebase path URL to save data in database.
    const path: any = {};
    path["itemPath"] = `${this.value}/${role}`;

    const updatedRoles = { ...item.roles };
    const addedRole = !!e;
    if (addedRole) {
      updatedRoles[role] = true;
    } else {
      delete updatedRoles[role];
    }
    this.$emit("save", item, path, addedRole === true ? addedRole : null, {
      itemPath: "roles",
      newValue: updatedRoles,
    });
  }

  get itemRoles() {
    return this.item.roles || {};
  }

  getRoleDisplayValue(role: string) {
    return _.upperFirst(role);
  }
}
</script>

<style scoped>
.v-menu__activator {
  height: 100%;
  width: 100%;
}
</style>
