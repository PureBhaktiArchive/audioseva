<template>
  <div>
    <div v-if="isLoadingLists">
      <div class="elevation-1 pa-1">
        <span :style="{ marginRight: '4px' }">Loading...</span>
        <v-progress-circular indeterminate :size="15" :width="2"></v-progress-circular>
      </div>
    </div>

    <v-data-table v-if="users.length"
      :headers="headers"
      :items="users"
      :datatableProps="{ loading: isLoadingLists }"
    >
      <template slot="items" slot-scope="props">
        <!-- Inline notes edit -->
        <td>
          <v-edit-dialog
            :return-value.sync="props.item.notes"
            lazy
            @save="save"
            @cancel="cancel"
            @open="open"
            @close="close"
          > {{ props.item.notes }}
            <v-text-field
              slot="input"
              v-model="props.item.notes"
              :rules="[max25chars]"
              label="Edit notes"
              single-line
              counter
            ></v-text-field>
          </v-edit-dialog>
        </td>
        <!-- Status edit -->
        <td class="text-xs-right">
          <v-edit-dialog
            :return-value.sync="props.item.status"
            lazy
            @save="save"
            @cancel="cancel"
            @open="open"
            @close="close"
          > {{ props.item.status }}
            <v-select
              slot="input"
              v-model="status"
              :items="statusItems"
              box
              chips
              label="Change status"
              multiple
            ></v-select>
          </v-edit-dialog>
        </td>

        <td class="text-xs-right"> {{ props.item.timestamp }}</td>
        <td class="text-xs-right"> {{ props.item.name }}</td>
        <td class="text-xs-right"> {{ props.item.location }}</td>
        <td class="text-xs-right"> {{ props.item.emailAddress }}</td>
        <td class="text-xs-right"> {{ props.item.phoneNumber }}</td>
        <td class="text-xs-right"> {{ props.item.languages }}</td>

        <td class="text-xs-right">
          <v-edit-dialog
            :return-value.sync="props.item.roles"
            lazy
            @save="save"
            @cancel="cancel"
            @open="open"
            @close="close"
          > {{ props.item.roles }}
            <v-switch v-for="(role, index) in roles" :key="index"
              slot="input"
              :label="role"
              :value="role"></v-switch>
          </v-edit-dialog>
        </td>
        <td class="text-xs-right"> {{ props.item.experience }}</td>
        <td class="text-xs-right"> {{ props.item.influencer }}</td>
        <td class="text-xs-right"> {{ props.item.recommendedBy }}</td>
      </template>
      <template slot="table-no-data">
        <div>
          <div :style="{ justifyContent: 'center' }" class="d-flex" v-if="isLoadingLists">
            <v-progress-circular indeterminate></v-progress-circular>
          </div>
        </div>
        </template>
    </v-data-table>

    <v-snackbar v-model="snack" :timeout="5000" :color="snackColor">
      {{ snackText }}
      <v-btn flat @click="snack = false">Close</v-btn>
    </v-snackbar>
  </div>
</template>

<script>
import DataTable from "@/components/DataTable.vue";

export default {
  name: "UsersList",
  data() {
    return {
      users: [],
      isLoadingLists: false,
      snack: false,
      snackColor: "",
      snackText: "",
      pagination: {},
      statusItems: ["Empty", "Opted out", "Lost", "Duplicate", "Incorrect"],
      status: ["Empty", "Opted out", "Lost", "Duplicate", "Incorrect"],
      roles: ["CR", "TE", "SE", "QC", "FC", "SQR Coordinator"],
      max25chars: v => v.length <= 25 || "Input too long!",
      headers: [
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
      ]
    };
  },
  components: {
    DataTable
  },
  methods: {
    async retrieveUsers() {
      let userObj = null;
      let usersList = [];
      let lang = "";
      let langString = "";
      let roles = "";
      let rolesString = "";
      this.isLoadingLists = true;
      const response = await this.$http.get(
        process.env.VUE_APP_FIREBASE_DATABASE_URL + "/users.json"
      );
      userObj = response.data;
      for (let index in userObj) {
        let result = userObj[index];
        lang = JSON.stringify(result.languages);
        roles = JSON.stringify(result.roles);
        result.languages = this.commaSeparated(lang, langString);
        result.roles = this.commaSeparated(roles, rolesString);
        usersList.push(result);
      }
      this.users = usersList;
      this.isLoadingLists = false;
    },
    commaSeparated(value, comma) {
      comma = value.replace(/{|}|true|"|:/gi, "\n");
      return comma;
    },
    save() {
      //Save data on edit
      this.snack = true;
      this.snackColor = "success";
      this.snackText = "Data saved";
    },
    cancel() {
      this.snack = true;
      this.snackColor = "error";
      this.snackText = "Canceled";
    },
    open() {
      this.snack = true;
      this.snackColor = "info";
      this.snackText = "Dialog opened";
    },
    close() {
      console.log("Dialog closed");
    }
  },
  computed: {
    listUsers() {
      return this.retrieveUsers();
    }
  },
  created() {
    return this.listUsers;
  }
};
</script>
