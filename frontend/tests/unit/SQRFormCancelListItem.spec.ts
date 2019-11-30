import { mount, createLocalVue } from "@vue/test-utils";
import Vuetify from "vuetify";
import vuetifyOptions from "@/vuetifyOptions";
import CancelListItem from "@/components/SQRForm/CancelListItem.vue";

const localVue = createLocalVue();

describe("SQRFormCancelListItem", () => {
  let vuetify: typeof Vuetify;
  let propsData: { [key: string]: any };

  const getWrapper = (props: any = {}) =>
    mount(CancelListItem, {
      localVue,
      vuetify,
      propsData,
      ...props
    });

  const clickListItem = (wrapper: any) =>
    wrapper.find("[role='button']").trigger("click");

  beforeEach(() => {
    vuetify = new Vuetify(vuetifyOptions);
    propsData = {
      header: "CLICK HERE if you are unable to play or download the audio",
      label: "I'm unable to play or download the audio",
      placeholder:
        "Please describe the problem here, we will allot you new lectures shortly",
      styles: {
        backgroundColor: "#fcf8e3",
        color: "#8a6d3b",
        border: "solid .2rem #faebcc",
        whiteSpace: "none",
        width: "100%"
      },
      selected: false
    };
  });

  it("should render", () => {
    const wrapper = getWrapper();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it("should emit click on list-group click", () => {
    const wrapper = getWrapper();
    clickListItem(wrapper);
    expect(wrapper.emitted().click).toBeTruthy();
  });

  it("should emit update:selected on checkbox selected", () => {
    const wrapper = getWrapper();
    clickListItem(wrapper);
    wrapper.find("input[type='checkbox']").setChecked();
    expect(wrapper.emitted()["update:selected"]).toBeTruthy();
  });

  it("should show cancel inputs when checkbox is selected", () => {
    const wrapper = getWrapper();
    clickListItem(wrapper);
    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
    wrapper.setProps({ selected: true });
    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("should emit input event on textarea input", () => {
    const wrapper = getWrapper();
    clickListItem(wrapper);
    wrapper.setProps({ selected: true });
    wrapper.find("textarea").setValue("new text");
    expect(wrapper.emitted().input[0][0]).toEqual("new text");
  });
});
