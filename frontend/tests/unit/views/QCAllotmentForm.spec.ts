import { mount } from "@vue/test-utils";
import QCAllotmentForm from "@/views/QCAllotmentForm.vue";

describe("QCAllotmentForm", () => {
  it("should render", () => {
    const wrapper = mount(QCAllotmentForm, {
      data: () => ({
        task: {
          ".key": "1234",
          soundIssues: []
        }
      }),
      mocks: {
        $route: {
          params: {
            taskId: "list1-list1"
          }
        }
      },
      methods: {
        getData: () => {}
      }
    });
    expect(wrapper).toMatchSnapshot();
  });
});
