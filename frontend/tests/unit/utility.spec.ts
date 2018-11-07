import moment from "moment";
import { getDayDifference } from "@/utility";
describe('utility', function () {
  test("getDayDifference", () => {
    moment.now = () => +new Date(1541497995699);
    const result = getDayDifference(1540630053685);
    expect(result).toEqual(10);
  });
});
