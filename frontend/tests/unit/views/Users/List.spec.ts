import { shallowMount } from "@vue/test-utils";
import List from "@/views/Users/List.vue";

const users = [
  {
    ".key": "1",
    status: "OK",
    languages: {
      English: true
    },
    roles: {
      SQR: true
    },
    name: "person1"
  },
  {
    ".key": "2",
    status: "Lost",
    languages: {
      English: true
    },
    roles: {
      SQR: true,
      CR: true
    },
    name: "person2"
  }
];

describe("Users list", () => {
  it('should filter items', () => {
    const wrapper = shallowMount(List, {
      data: () => ({
        users,
        selectedRole: "CR",
        filterActiveUsers: false,
        search: "perso"
      }),
      methods: {
        fetchUsers: () => null
      }
    });
    expect(wrapper.vm.items[0]).toEqual(users[1]);
  });
});
