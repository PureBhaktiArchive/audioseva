<template>
  <div>Access denied <v-btn @click="signOut">Sign out</v-btn></div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { mapActions } from "vuex";

@Component({
  name: "RestrictedView",
  methods: {
    ...mapActions("user", ["signOut"])
  }
})
export default class RestrictedView extends Vue {}
</script>

<style scoped>
</style>
