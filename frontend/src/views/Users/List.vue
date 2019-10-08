<template>
  <div>
    <header>
      <h1>People</h1>
    </header>
    <v-row justify="space-between" >
      <v-col cols="12" sm="5" md="3">
        <v-text-field
          v-model="search"
          append-icon="fa-search"
          label="Filter users"
          single-line
          hide-details
        ></v-text-field>
      </v-col>
      <v-col class="d-flex" align-self="center" cols="12" md="8">
        <v-row justify="end" >
          <v-col md="9" xl="4" align-self="center">
            <v-btn-toggle v-model="selectedButton" mandatory>
              <v-btn v-for="(value, key, index) in allRoles" :key="index">{{ value }}</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col md="3" align-self="center">
            <v-switch
              :style="{ justifyContent: 'flex-end' }"
              v-model="filterActiveUsers"
              label="Only active"
            ></v-switch>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <data-table
      :items="items"
      :headers="headers"
      :computedComponent="computedComponent"
      :componentData="componentData"
      :computedValue="computedValue"
      :datatableProps="{ 'loading': isLoadingUsers }"
      :tableRowStyle="tableRowStyle"
    ></data-table>
    <v-snackbar v-model="snack" :timeout="3000" :color="snackColor">
      {{ snackText }}
      <v-btn flat @click="snack = false">Close</v-btn>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";
import moment from "moment";
import firebase from "firebase/app";
import "firebase/database";
import DataTable from "@/components/DataTable.vue";
import InlineTextEdit from "@/components/InlineTextEdit.vue";
import InlineStatusEdit from "@/components/InlineStatusEdit.vue";
import InlineRolesEdit from "@/components/Users/InlineRolesEdit.vue";
import PhoneNumber from "@/components/Users/PhoneNumber.vue";

@Component({
  name: "List",
  components: { DataTable }
})
export default class List extends Vue {
  isLoadingUsers: boolean = true;
  users: any[] = [];
  roles = ["CR", "TE", "SE", "FC", "SQR", "coordinator"];
  statusItems = ["OK", "Opted out", "Lost", "Duplicate", "Incorrect"];
  filterActiveUsers = true;
  keyPath: string = "users";
  search: string = "";
  selectedButton: number = 0;
  snack = false;
  snackColor = "";
  snackText = "";
  editEvents = {
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
      on: { ...this.editEvents },
      props: {
        statusItems: this.statusItems
      }
    },
    roles: {
      on: { ...this.editEvents },
      props: {
        roles: this.roles
      }
    }
  };
  computedValue = {
    languages: (val: any, item: any) => {
      return Object.keys(item[val] || {}).join(", ");
    },
    timestamp: (val: any, item: any) => {
      const timestamp = item[val];
      const localeFormat = moment(timestamp)
        .creationData()
        .locale.longDateFormat("L");
      return moment(timestamp).format(localeFormat);
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

  tableRowStyle(item: any) {
    if (item.status !== "OK") {
      return {
        backgroundColor: "#FFEE58"
      };
    }
    return {};
  }

  searchFields(item: any) {
    let matchedItem = false;
    for (const value of Object.values(item)) {
      if (
        typeof value === "string" &&
        value.toLowerCase().includes(this.searchValue)
      ) {
        matchedItem = true;
        break;
      }
    }
    return matchedItem;
  }

  get items() {
    return this.users.filter((user: any) => {
      let hasRole = false;
      let matchesSearch = false;
      let isActive;
      if (this.selectedRole === "All") {
        hasRole = true;
      } else {
        hasRole = user.roles && user.roles[this.selectedRole];
      }
      if (!this.searchValue) {
        matchesSearch = true;
      } else {
        matchesSearch = this.searchFields(user);
      }
      if (this.filterActiveUsers) {
        isActive = user.status === "OK";
      } else {
        isActive = true;
      }
      return matchesSearch && hasRole && isActive;
    });
  }

  get allRoles() {
    return ["All", ...this.roles];
  }

  get selectedRole() {
    return this.allRoles[this.selectedButton];
  }

  get searchValue() {
    return this.search.toLowerCase();
  }

  fetchUsers() {
    this.$bindAsArray(
      "users",
      firebase.database().ref("users"),
      null,
      () => (this.isLoadingUsers = false)
    );
  }

  save(
    item: any,
    path: any,
    updates: any,
    { itemPath, newValue }: { [key: string]: any } = { itemPath: false }
  ) {
    this.snack = true;
    this.snackColor = "success";
    this.snackText = "Data saved";
    const refPath = `users/${item[".key"]}/${path.itemPath}`;

    // manual update state if component can't use v-model
    if (itemPath) {
      this.$set(
        this.users,
        this.users.findIndex(user => user[".key"] === item[".key"]),
        _.setWith(_.clone(item), itemPath, newValue, _.clone)
      );
    }
    firebase
      .database()
      .ref(refPath)
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
