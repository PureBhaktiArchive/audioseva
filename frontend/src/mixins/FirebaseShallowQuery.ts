import { Component, Vue } from "vue-property-decorator";

import fb from "@/firebaseApp";

@Component
export default class FirebaseShallowQuery extends Vue {
  lists: string[] | null = null;
  listsBasePath: string = "files";

  async getLists() {
    const response: any = await this.$http.get(
      `${(fb.options as any).databaseURL}/${
        this.listsBasePath
      }.json?shallow=true`
    );
    this.lists = response.body ? Object.keys(response.body) : [];
  }
}
