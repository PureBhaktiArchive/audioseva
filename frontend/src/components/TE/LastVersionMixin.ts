import { Component, Prop, Vue } from "vue-property-decorator";

@Component
export default class LastVersionMixin extends Vue {
  @Prop() item!: { [key: string]: any };

  get lastVersion() {
    return (
      this.item.versions &&
      (Object.values(this.item.versions).pop() as { [key: string]: any })
    );
  }

  get lastResolution() {
    return this.lastVersion && this.lastVersion.resolution;
  }

  get lastIsApproved() {
    return this.lastResolution && this.lastResolution.isApproved;
  }
}
