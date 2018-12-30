import { Component, Vue } from "vue-property-decorator";

@Component
export default class FirebaseShallowQuery extends Vue {
  lists: string[] | null = null;
  listsBasePath: string = "files";

  async getLists() {
    const response: any = await this.$http.get(
      `${process.env.VUE_APP_FIREBASE_DATABASE_URL}/${
        this.listsBasePath
      }.json?shallow=true`
    );
    this.lists = Object.keys(response.body);
  }
}
