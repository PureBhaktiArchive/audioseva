import { Component, Vue } from "vue-property-decorator";

import firebase from "firebase/app";

@Component
export default class FirebaseShallowQuery extends Vue {
  lists: string[] | null = null;
  listsBasePath: string = "files";

  async getLists() {
    const response: any = await this.$http.get(
      `${(firebase.app().options as any).databaseURL}/${
        this.listsBasePath
      }.json?shallow=true`
    );
    this.lists = response.body ? Object.keys(response.body) : [];
  }
}
