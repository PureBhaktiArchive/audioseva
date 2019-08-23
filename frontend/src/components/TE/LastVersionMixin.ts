import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component
export default class LastVersionMixin extends Vue {
  get version() {
    return _.get(this.item, `versions[${this.item.versions.length - 1}]`);
  }
}
