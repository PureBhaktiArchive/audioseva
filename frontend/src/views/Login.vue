/*
 * sri sri guru gauranga jayatah
 */

<template>
  <v-layout align-center justify-center fill-height>
    <div id="firebaseui-auth-container"></div>
  </v-layout>
</template>

<script>
import firebase from "firebase/app";
import firebaseui from "firebaseui";

export default {
  name: "auth",
  data: () => ({
    ui: new firebaseui.auth.AuthUI(firebase.auth())
  }),
  mounted() {
    const uiConfig = {
      signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
      signInFlow: "popup",
      callbacks: {
        signInSuccessWithAuthResult: () => {
          this.$router.replace(this.$route.query.redirect || "/");
          return false;
        }
      }
    };

    this.ui.start("#firebaseui-auth-container", uiConfig);
  },
  beforeDestroy() {
    this.ui.delete();
  }
};
</script>

<style>
@import "../../node_modules/firebaseui/dist/firebaseui.css";
</style>
