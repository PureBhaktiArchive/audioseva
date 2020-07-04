import BaseTaskMixin from '@/components/TE/BaseTaskMixin';
import { Component, Mixins, Prop } from 'vue-property-decorator';

@Component
export default class LastVersionMixin extends Mixins<BaseTaskMixin>(
  BaseTaskMixin
) {
  @Prop() item!: { [key: string]: any };

  get lastVersion() {
    return this.getLastVersion(this.item);
  }

  get lastResolution() {
    return this.lastVersion && this.lastVersion.resolution;
  }

  get lastIsApproved() {
    return this.lastResolution && this.lastResolution.isApproved;
  }
}
