import { Component, Vue } from "vue-property-decorator";
import moment from "moment";

@Component
export default class FormatDurationUtc extends Vue {
  formatDurationUtc(
    duration: any,
    format: string,
    unit: moment.DurationInputArg2 = "seconds",
    useLocal = false
  ) {
    const time = moment.utc(moment.duration(duration, unit).asMilliseconds());
    return useLocal ? time.local().format(format) : time.format(format);
  }
}
