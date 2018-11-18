import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "TableData"
})
export default class TableData extends Vue {
  @Prop() component!: any;

  @Prop() componentData!: { [key: string]: any };

  render(createElement: any) {
    const { Component, ...props } = this.$attrs;
    const { props: otherProps = {}, ...other } = this.componentData;

    return createElement(
        Component,
        // spread props from data table component plus otherProps passed in from parent of data table component
        {
          props: {
            ...otherProps,
            ...props
          },
          ...other
        })
  }
}
