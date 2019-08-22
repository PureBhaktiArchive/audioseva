import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class FormatTimeLocal extends Vue {
  formatTimeLocal(time: moment.MomentInput, format: string) {
    return moment(time)
      .local()
      .format(format);
  }
}
