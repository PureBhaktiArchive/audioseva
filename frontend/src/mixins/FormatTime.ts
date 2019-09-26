import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class FormatTime extends Vue {
  formatDurationUtc(
    duration: any,
    format: string,
    unit: moment.DurationInputArg2 = "seconds"
  ) {
    return moment
      .utc(moment.duration(duration, unit).asMilliseconds())
      .format(format);
  }

  formatTimestamp(time: moment.MomentInput) {
    return moment(time)
      .local()
      .format(this.getDateFormat(time));
  }

  getDateFormat(timestamp: moment.MomentInput) {
    return moment(timestamp).isSame(moment(), "day") ? "LT" : "L";
  }
}
