import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";

import firebase from "firebase/app";
import "firebase/database";

@Component
export default class InlineSave extends Vue {
  itemsKey: string = "items";
  itemComparePath: string = ".key";
  snack!: boolean;
  snackColor!: string;
  snackText!: string;

  getUpdatePath(item: any, path: any) {
    return "";
  }

  openSnackbar() {
    this.snack = true;
    this.snackColor = "success";
    this.snackText = "Data saved";
  }

  cancel() {
    this.snack = true;
    this.snackColor = "error";
    this.snackText = "Canceled";
  }

  get items() {
    return this[this.itemsKey];
  }

  updateFields(item: any, fieldUpdates: any) {
    this.$set(
      this.getUpdateItems(),
      this.items.findIndex(
        (i: any) => i[this.itemComparePath] === item[this.itemComparePath]
      ),
      _.merge({}, item, fieldUpdates)
    );
  }

  multiFieldSave(item: any, itemPath: string, paths: any, fieldUpdates: any) {
    this.updateFields(item, fieldUpdates);
    firebase
      .database()
      .ref(this.getUpdatePath(item, { itemPath }))
      .update(paths);
  }

  getUpdateItems() {
    return this.itemsKey ? this[this.itemsKey] : this.items;
  }

  save(
    item: any,
    path: any,
    updates: any,
    { itemPath, newValue }: { [key: string]: any } = { itemPath: false }
  ) {
    this.openSnackbar();

    // firebase Path URL to save data in database.
    const refPath = this.getUpdatePath(item, path);

    // manual update state if component can't use v-model
    if (itemPath) {
      this.$set(
        this.getUpdateItems(),
        this.items.findIndex(
          (i: any) => i[this.itemComparePath] === item[this.itemComparePath]
        ),
        _.setWith(_.clone(item), itemPath, newValue, _.clone)
      );
    }

    firebase
      .database()
      .ref(refPath)
      .set(updates);
  }
}
