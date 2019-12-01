/* * sri sri guru gauranga jayatah */
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" class="text-center mt-5">
        <h1>Welcome to Audio Seva</h1>
        <home-page-buttons></home-page-buttons>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import HomePageButtons from "../components/HomePageButtons";
export default {
  name: "Home",
  title: "Home",
  components: { HomePageButtons }
};
</script>
