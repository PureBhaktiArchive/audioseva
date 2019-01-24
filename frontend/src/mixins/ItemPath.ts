import { Component, Prop, Vue } from "vue-property-decorator";
import _ from "lodash";

@Component
export default class ItemPath extends Vue {
  @Prop() updateForm!: any;
  @Prop() updatePath!: string;
  @Prop() item!: any;
  @Prop() value!: any;
  @Prop() pathOverride!: any;
  @Prop() form!: any;

  get itemPath() {
    return this.pathOverride ? this.pathOverride : `${this.updatePath}.${this.item}.${this.value}`;
  }

  getValue(): any {
    return _.get(this.form, this.itemPath, "");
  }
}