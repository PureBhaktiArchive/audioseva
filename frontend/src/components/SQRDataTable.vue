<template>
  <v-data-table :headers="headers" :items="files">
    <template
      slot="items"
      slot-scope="{
        item: {
          daysPassed = 'missing days passed',
          dateGiven = 'missing date given',
          notes = '',
          languages = [],
          status = 'Spare',
          devotee = 'missing devotee',
          emailAddress = 'missing email',
          dateDone = 'N/A',
          followUp = 'N/A',
          ['.key']: fileName
        }
      }"
    >
      <td>{{ daysPassed }}</td>
      <td>{{ dateGiven }}</td>
      <td>{{ notes }}</td>
      <td>{{ languages.join(", ") }}</td>
      <td>{{ status }}</td>
      <td>{{ fileName }}</td>
      <td>{{ devotee }}</td>
      <td>{{ emailAddress }}</td>
      <td>{{ dateDone }}</td>
      <td>{{ followUp }}</td>
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { Component, Vue, Prop } from "vue-property-decorator";
import { ISQRFile } from "@/types/SQRDataTable";

@Component({
  name: "SQRDataTable"
})
export default class SQRDataTable extends Vue {
  @Prop() files!: ISQRFile[];

  headers = [
    { text: "Days Passed", value: "allotment.daysPassed" },
    { text: "Date Given", value: "allotment.dateGiven" },
    { text: "Notes", value: "notes" },
    { text: "Languages", value: "languages" },
    { text: "Status", value: "status" },
    { text: "File Name", value: "filename" },
    { text: "Devotee", value: "devotee" },
    { text: "Email Address", value: "emailAddress" },
    { text: "Date Done", value: "dateDone" },
    { text: "Follow Up", value: "followup" }
  ];
}
</script>

<style scoped>
</style>
