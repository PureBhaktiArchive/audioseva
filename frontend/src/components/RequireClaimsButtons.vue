<template>
  <span>
    <v-btn :key="button.text" v-for="button in buttons" v-bind="button.props">
      {{ button.text }}
    </v-btn>
  </span>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import "firebase/auth";

@Component({
  name: "RequireClaimsButtons"
})
export default class RequireClaimsButtons extends Vue {
  userClaims: any = {};
  initialButtons = [
    {
      claims: { TE: true },
      props: {
        to: "te/upload",
        color: "primary"
      },
      text: "Upload"
    }
  ];

  mounted() {
    this.getUserClaims();
  }

  get buttons() {
    return this.initialButtons.filter((button: any) => {
      return Object.entries(this.userClaims).some(([claimName, claimValue]) => {
        return button.claims[claimName] === claimValue;
      });
    });
  }

  async getUserClaims() {
    this.userClaims = (await firebase
      .auth()
      .currentUser.getIdTokenResult()).claims;
  }
}
</script>

<style scoped>
</style>
