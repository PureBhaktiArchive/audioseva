<template>
  <v-menu
    :style="{
      maxWidth: '150px',
      width: `${Object.keys(item.roles).length * 50}px`,
      minWidth: '70px'
    }"
    :close-on-content-click="false">
    <div slot="activator">
      <v-chip v-for="(role, index) in Object.keys(item.roles)" :key="`${index}-${role}-chip`">
        {{ role }}
      </v-chip>
    </div>
    <v-list v-for="(role, index) in roles" :key="index">
      <v-list-tile>
        <v-list-tile-action>
          <v-switch
            @change="handleChange($event, role)"
            :label="role"
            :input-value="item.roles[role]">
          </v-switch>
        </v-list-tile-action>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "InlineRolesEdit"
})
export default class InlineRolesEdit extends Vue {
  @Prop() item!: any;
  roles = ["CR", "TE", "SE", "QC", "FC", "SQR", "Coordinator"];

  handleChange(e: any, role: string) {
    const { item } = this;
    const path = `users/${item[".key"]}/roles/${role}`;
    const updatedRoles = { ...item.roles };
    const addedRole = !!e;
    if (addedRole) {
      updatedRoles[role] = true;
    } else {
      delete updatedRoles[role];
    }
    this.$emit("save", item, path, addedRole === true ? addedRole : null, {
      itemPath: "roles",
      newValue: updatedRoles
    });
  }
}
</script>

<style scoped>
</style>
