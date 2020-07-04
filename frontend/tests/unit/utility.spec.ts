import {
  formatTimestamp,
  getDayDifference,
  getLastDays,
  getPathAndKey,
  getProjectDomain,
  mergeDoneStatistics,
  removeObjectKey,
} from '@/utility';
import moment from 'moment-timezone';

describe('utility', function () {
  beforeEach(() => {
    moment.now = () => +new Date();
  });

  test('getProjectDomain', () => {
    delete (global as any).window.location;
    (global as any).window = Object.create(window);
    (global as any).window.location = { host: 'app.dev.audioseva.com' };
    expect(getProjectDomain()).toEqual('dev.audioseva.com');
  });

  test('getDayDifference', () => {
    moment.now = () => +new Date(1541497995699);
    const result = getDayDifference(1540630053685);
    expect(result).toEqual(10);
  });

  test('getLastDays', () => {
    (moment as any).tz.setDefault('America/New_York');
    moment.now = () => +new Date(1541497995699);
    const result = getLastDays();
    expect(result).toMatchSnapshot();
  });

  test('mergeDoneStatistics', () => {
    moment.now = () => +new Date(1541497995699);
    const doneStatistics = {
      today: 1,
      [moment().subtract(1, 'days').format('MMM DD')]: 1,
    };
    const results = mergeDoneStatistics(doneStatistics);
    expect(results).toMatchSnapshot();
  });

  test('formatTimestamp', () => {
    moment.now = () => +new Date(1541497995699);
    const item = {
      allotment: {
        timestampGiven: moment().valueOf(),
      },
    };
    const results = formatTimestamp('allotment.timestampGiven', item);
    expect(results).toEqual('6.11.2018');
  });

  test('removeObjectKey', () => {
    const data = {
      nested: [{}, {}],
    };
    removeObjectKey(data, getPathAndKey('nested.0'));
    expect(data.nested).toEqual([{}]);
  });
});
