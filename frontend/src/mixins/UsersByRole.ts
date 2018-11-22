import { Component, Vue } from "vue-property-decorator";
import fb from "@/firebaseApp";
import { filteredStatus } from "@/utility";

@Component
export default class UserByRole extends Vue {
  users: any[] = [];
  usersBindName: string = "users";
  usersRole: string = "";

  getUsers() {
    this.$bindAsArray(
        this.usersBindName,
        fb
            .database()
            .ref("/users")
            .orderByChild(`roles/${this.usersRole}`)
            .equalTo(true),
        null,
        this.filterUsers
    )
  }

  filterUsers() {
    this.users = this.users.reduce((users, { status, ...other }) => {
      const user = { status, ...other };
      if (!filteredStatus.includes(status)) {
        users.push(user);
      }
      if (this.$route.query.emailAddress === other.emailAddress) this.allotment.assignee = user;
      return users;
    }, [])
  }
}
