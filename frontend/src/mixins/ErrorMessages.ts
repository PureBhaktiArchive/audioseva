import { Component, Vue } from 'vue-property-decorator';

@Component
export default class ErrorMessages extends Vue {
  errors: { [key: string]: any } = {};

  addErrorMessage(errorKey: string) {
    return (e: any) => {
      this.$set(this.errors, errorKey, e.message);
    };
  }
}
