import moment from 'moment';
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class FormatTime extends Vue {
  formatDurationUtc(
    duration: any,
    format: string,
    unit: moment.DurationInputArg2 = 'seconds'
  ) {
    return moment
      .utc(moment.duration(duration, unit).asMilliseconds())
      .format(format);
  }

  formatTimestamp(time: moment.MomentInput) {
    const timeMoment = moment(time);
    return timeMoment
      .local()
      .format(timeMoment.isSame(moment(), 'day') ? 'HH:mm' : 'YYYY-MM-DD');
  }
}
