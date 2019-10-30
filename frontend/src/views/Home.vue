/* * sri sri guru gauranga jayatah */
<template>
  <v-container fluid>
    <v-layout row wrap>
      <v-flex xs12 class="text-xs-center" mt-5>
        <h1>Welcome to Audio Seva</h1>
        <home-page-buttons></home-page-buttons>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import HomePageButtons from "../components/HomePageButtons";
export default {
  name: "Home",
  components: { HomePageButtons }
};
</script>
