import moment from "moment";
import { getDayDifference, getLastDays, mergeDoneStatistics, formatTimestamp } from "@/utility";

describe('utility', function () {
  beforeEach(() => {
    moment.now = () => +new Date();
  });

  test("getDayDifference", () => {
    moment.now = () => +new Date(1541497995699);
    const result = getDayDifference(1540630053685);
    expect(result).toEqual(10);
  });

  test("getLastDays", () => {
    moment.now = () => +new Date(1541497995699);
    const result = getLastDays();
    expect(result).toMatchSnapshot();
  });

  test("mergeDoneStatistics", () => {
    moment.now = () => +new Date(1541497995699);
    const doneStatistics = {
      today: 1,
      [moment().subtract(1, "days").format("MMM DD")]: 1
    };
    const results = mergeDoneStatistics(doneStatistics);
    expect(results).toMatchSnapshot();
  });

  test.only("formatTimestamp", () => {
    moment.now = () => +new Date(1541497995699);
    const item = {
      allotment: {
        timestampGiven: moment().valueOf()
      }
    };
    const results = formatTimestamp("allotment.timestampGiven", item);
    expect(results).toEqual("6.11.2018");
  })
});
