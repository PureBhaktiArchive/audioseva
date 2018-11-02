import { shallowMount } from "@vue/test-utils";
import SQRFileStatistics from "@/views/SQRFileStatistics.vue";

const lists = {
  list1: {
    file1: {
      status: "Spare",
      languages: ["English"]
    },
    file2: {
      status: "Spare",
      languages: ["English"]
    }
  },
  list2: {
    file3: {
      status: "Spare",
      languages: ["English"]
    },
    file4: {
      status: "Spare",
      languages: ["Bengali"]
    }
  }
};

describe('SQRFileStatistics', () => {
  it('should extract files', () => {
    const wrapper = shallowMount(SQRFileStatistics, {
      mocks: {
        lists
      },
      methods: {
        fetchLists: () => null
      }
    });
    wrapper.vm.extractFiles();
    expect(wrapper.vm.files).toHaveLength(4);
  });
});
