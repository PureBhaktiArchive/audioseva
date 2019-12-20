<template>
  <router-view></router-view>
</template>

<script>
import firebase from "firebase/app";
import "firebase/database";
export default {
  data() {
    return {
      quotes: []
    };
  },
  mounted() {
    this.getQuotes();
  },
  methods: {
    async getQuotes() {
      await this.$rtdbBind("quotes", firebase.database().ref("quotes"));
      localStorage.setItem(
        "quotes",
        JSON.stringify(this.quotes.map(quote => quote.text))
      );
    }
  }
};
</script>
