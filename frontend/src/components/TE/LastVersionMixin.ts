import { Component, Vue } from "vue-property-decorator";

@Component
export default class LastVersionMixin extends Vue {
  get lastVersion() {
    return (
      this.item.versions && this.item.versions[this.item.versions.length - 1]
    );
  }

  get lastResolution() {
    return this.lastVersion && this.lastVersion.resolution;
  }

  get lastIsApproved() {
    return this.lastResolution && this.lastResolution.isApproved;
  }
}
