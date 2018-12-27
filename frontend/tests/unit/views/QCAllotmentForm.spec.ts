import { shallowMount } from "@vue/test-utils";
import QCAllotmentForm from "@/views/QCAllotmentForm.vue";

describe('QCAllotmentForm', () => {
  it("should render", () => {
    const wrapper = shallowMount(QCAllotmentForm, {
      data: () => ({
        task: {
          ".key": "1234",
          soundIssues: []
        },
        originalFile: "link1",
        restoredFile: "link2"
      }),
      methods: {
        getData: () => {}
      }
    });
    expect(wrapper).toMatchSnapshot();
  });
});
