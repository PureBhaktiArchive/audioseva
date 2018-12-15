<template>
  <div>
    <data-table
      :items="users"
      :headers="headers"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :computedValue="computedValue"
      :datatableProps="{ 'loading': isLoadingUsers }"
    >
    </data-table>
    <v-snackbar v-model="snack" :timeout="3000" :color="snackColor">
      {{ snackText }}
      <v-btn flat @click="snack = false">Close</v-btn>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import fb from "@/firebaseApp";
import DataTable from "@/components/DataTable.vue";
import InlineTextEdit from "@/components/Users/InlineTextEdit.vue";
import InlineStatusEdit from "@/components/Users/InlineStatusEdit.vue";
import InlineRolesEdit from "@/components/Users/InlineRolesEdit.vue";
import PhoneNumber from "@/components/Users/PhoneNumber.vue";

@Component({
  name: "List",
  components: { DataTable }
})
export default class List extends Vue {
  isLoadingUsers: boolean = true;
  users: any[] = [];
  snack = false;
  snackColor = "";
  snackText = "";
  editEvents = {
    open: this.open,
    save: this.save,
    cancel: this.cancel
  };
  computedComponent = {
    notes: InlineTextEdit,
    status: InlineStatusEdit,
    roles: InlineRolesEdit,
    phoneNumber: PhoneNumber
  };
  componentData = {
    notes: {
      on: { ...this.editEvents }
    },
    status: {
      on: { ...this.editEvents }
    },
    roles: {
      on: { ...this.editEvents }
    }
  };
  computedValue = {
    languages: (val: any, item: any) => {
      return Object.keys(item[val]).join(", ");
    }
  };

  headers = [
    { text: "Notes", value: "notes" },
    { text: "Status", value: "status" },
    { text: "Timestamp", value: "timestamp" },
    { text: "Name", value: "name" },
    { text: "Location", value: "location" },
    { text: "Email Address", value: "emailAddress" },
    { text: "Phone Number", value: "phoneNumber" },
    { text: "Languages", value: "languages" },
    { text: "Roles", value: "roles" },
    { text: "Experience", value: "experience" },
    { text: "Influencer", value: "influencer" },
    { text: "Recommended By", value: "recommendedBy" }
  ];

  mounted() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.$bindAsArray(
      "users",
      fb.database().ref("users"),
      null,
      () => (this.isLoadingUsers = false)
    );
  }

  open() {
    this.snack = true;
    this.snackColor = "info";
    this.snackText = "Dialog opened";
  }

  save(
    item: any,
    path: string,
    updates: any,
    { itemPath, newValue }: { [key: string]: any } = { itemPath: false }
  ) {
    this.snack = true;
    this.snackColor = "success";
    this.snackText = "Data saved";

    // manual update state if component can't use v-model
    if (itemPath) {
      this.$set(
        this.users,
        this.users.findIndex(user => user[".key"] === item[".key"]),
        _.setWith(_.clone(item), itemPath, newValue, _.clone)
      );
    }
    fb.database()
      .ref(path)
      .set(updates);
  }

  cancel() {
    this.snack = true;
    this.snackColor = "error";
    this.snackText = "Canceled";
  }
}
</script>

<style scoped>
</style>
