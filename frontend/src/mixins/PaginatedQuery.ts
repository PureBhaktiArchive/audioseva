import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component
export default class PaginatedQuery extends Vue {
  collection: any[] = [];
  page = 1;
  startAt: string = "";
  pageSize = 100;
  baseQuery: any;
  lastPage = 0;
  currentPageCollection: any[] = [];

  async next() {
    if (this.lastPage === this.page) return;
    this.page += 1;
    if (this.getPageSlice().length > 1) this.handleCollection();
    const baseQuery = this.baseQuery.startAt(this.startAt);
    const query = this.queryText
      ? baseQuery.endAt(`${this.queryText}b\uf8ff`)
      : baseQuery.orderByKey();
    await this.getCollection(query);
  }

  previous() {
    if (this.page === 1) return;

    this.page -= 1;
    this.handleCollection();
  }

  async first() {
    this.lastPage = 0;
    this.page = 1;
    const query = this.queryText
      ? this.baseQuery.startAt(this.queryText).endAt(`${this.queryText}b\uf8ff`)
      : this.baseQuery.orderByKey();
    await this.getCollection(query, true);
  }

  get queryText() {
    return "";
  }

  get queryField() {
    return "";
  }

  get limitBy() {
    return this.pageSize + 1;
  }

  getPageSlice() {
    return this.collection.slice(
      (this.page - 1) * this.pageSize,
      this.page * this.pageSize
    );
  }

  handleCollection() {
    this.currentPageCollection = this.getPageSlice();
  }

  async getCollection(query: any, firstPage = false) {
    const data = (await query.limitToFirst(this.limitBy).once("value")).val();
    if (!data) {
      this.lastPage = this.page;
      if (this.page === 1) {
        this.collection = [];
        this.handleCollection();
      }
      return;
    }

    const collection = Object.entries(data).map(([key, value]) => ({
      ".key": key,
      ...value
    }));
    if (collection.length < this.pageSize) {
      this.lastPage = this.page;
      this.updateCollection(collection, firstPage);
    } else {
      const startAt: any = collection.splice(-1)[0];
      this.startAt = _.get(
        startAt,
        this.queryField.split("/").join("."),
        startAt[".key"]
      );
      this.updateCollection(collection, firstPage);
    }
  }

  updateCollection(collection: any, firstPage = false) {
    if (firstPage) this.collection = collection;
    else this.collection = [...this.collection, ...collection];
    this.handleCollection();
  }
}
