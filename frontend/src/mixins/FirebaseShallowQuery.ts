import firebase from 'firebase/app';
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class FirebaseShallowQuery extends Vue {
  lists: string[] | null = null;
  listsBasePath: string = 'original';

  async getLists() {
    const response: any = await this.$http.get(
      `${(firebase.app().options as any).databaseURL}/${
        this.listsBasePath
      }.json?shallow=true`
    );
    this.lists = response.body ? Object.keys(response.body) : [];
  }
}
