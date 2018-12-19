<template>
  <v-menu
    :style="{
      maxWidth: '170px',
      width: `${Object.keys(item.roles).length * 50}px`,
      height: '100%'
    }"
    :close-on-content-click="false">
    <div slot="activator">
      <v-chip small v-for="(role, index) in Object.keys(item.roles)" :key="`${index}-${role}-chip`">
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
  @Prop() roles!: string[];

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
>>> .v-menu__activator {
  height: 100%;
  width: 100%;
}
</style>
