/*
 * sri sri guru gauranga jayatah
 */
<template>
  <v-container fluid>
    <v-layout row wrap>
      <v-flex xs12 class="text-xs-center" mt-5>
        <h1>Welcome to Audio Seva</h1>
        <require-claims-buttons></require-claims-buttons>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import RequireClaimsButtons from "../components/RequireClaimsButtons";
export default {
  name: "Home",
  components: { RequireClaimsButtons }
};
</script>
