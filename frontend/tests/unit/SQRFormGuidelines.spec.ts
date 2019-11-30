import { mount, createLocalVue } from "@vue/test-utils";
import Vuetify from "vuetify";
import vuetifyOptions from "@/vuetifyOptions";
import Guidelines from "@/components/SQRForm/Guidelines.vue";

const localVue = createLocalVue();

describe("SQRFormGuidelines", () => {
  it("should render", () => {
    const wrapper = mount(Guidelines, {
      localVue,
      vuetify: new Vuetify(vuetifyOptions),
      slots: { default: "Guidelines text here" }
    });
    wrapper.find("button").trigger("click");
    expect(wrapper.html()).toMatchSnapshot();
  });
});
