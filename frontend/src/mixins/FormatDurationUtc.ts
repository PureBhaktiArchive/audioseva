import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class FormatDurationUtc extends Vue {
  formatDurationUtc(duration: any, format: string) {
    return moment
      .utc(moment.duration(duration, "seconds").asMilliseconds())
      .format(format);
  }
}
