import { Component, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component
export default class LastVersionMixin extends Vue {
  get version() {
    return (
      this.item.versions &&
      _.get(this.item, `versions[${this.item.versions.length - 1}]`, false)
    );
  }

  get resolution() {
    return this.version && this.version.resolution;
  }

  get isApproved() {
    return this.resolution && this.resolution.isApproved;
  }
}
