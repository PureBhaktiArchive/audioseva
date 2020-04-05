/* * sri sri guru gauranga jayatah */

<template>
  <v-row class="fill-height" align="center" justify="center">
    <div id="firebaseui-auth-container"></div>
  </v-row>
</template>

<script>
import firebase from "firebase/app";
import * as firebaseui from "firebaseui";

export default {
  name: "auth",
  title: "Login",
  data: () => ({
    ui: new firebaseui.auth.AuthUI(firebase.auth()),
  }),
  mounted() {
    const uiConfig = {
      signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
      signInFlow: "popup",
      callbacks: {
        signInSuccessWithAuthResult: () => {
          this.$router.replace(this.$route.query.redirect || "/");
          return false;
        },
      },
    };

    this.ui.start("#firebaseui-auth-container", uiConfig);
  },
  beforeDestroy() {
    this.ui.delete();
  },
};
</script>

<style>
@import "../../node_modules/firebaseui/dist/firebaseui.css";

.v-content__wrap .container {
  height: 100%;
}

#firebaseui-auth-container ul.firebaseui-idp-list {
  padding-left: 0;
}
</style>
