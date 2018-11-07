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
      status: "Given",
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
    expect(wrapper.vm.filesByStatus).toMatchSnapshot("files by status");
    expect(wrapper.vm.spareByLanguage).toMatchSnapshot("spare by language");
    expect(wrapper.vm.fileCountByStatus).toMatchSnapshot("file count by status");
  });

  it("should get doneStatistics", () => {
    const today = new Date(1540685939096);
    const doneFiles = [
      {
        [".key"]: "list",
        completed: new Date(today).setDate(today.getDate() - 5)
      },
      {
        [".key"]: "list1",
        completed: new Date(today).setDate(today.getDate() - 4)
      },
      {
        [".key"]: "list2",
        completed: new Date(today).setDate(today.getDate() - 3)
      },
      {
        [".key"]: "list3",
        completed: new Date(today).setDate(today.getDate() - 2)
      },
      {
        [".key"]: "list4",
        completed: today
      },
      {
        [".key"]: "list5",
        completed: today
      }
    ];
    const oldDate = Date;
    // @ts-ignore
    global.Date = class extends oldDate {
      constructor(...args: any[]) {
        super();
        if (args.length) {
          // @ts-ignore
          return new oldDate(...args);
        }
        return new oldDate(1540685939096);
      }
    };
    const wrapper = shallowMount(SQRFileStatistics, {
      mocks: {
        doneFiles
      },
      methods: {
        fetchLists: () => null
      }
    });
    wrapper.vm.doneFileStatistics();
    expect(wrapper.vm.doneStatistics).toMatchSnapshot();
    // @ts-ignore
    global.Date = oldDate;
  });
});
