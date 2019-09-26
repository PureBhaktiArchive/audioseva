import Vue from "vue";
import Vuetify from "vuetify";

jest.mock("firebase/app", () => ({
  auth: jest.fn(() => ({
    currentUser: {
      getIdTokenResult: async () => {
        return {
          claims: {}
        };
      }
    }
  }))
}));

Vue.use(Vuetify);
