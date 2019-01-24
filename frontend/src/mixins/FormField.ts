import {Component, Prop, Vue} from "vue-property-decorator";

@Component
export default class FormField extends Vue {
  @Prop() updateForm!: any;
  @Prop() removeField!: any;
  @Prop() form!: any;
}