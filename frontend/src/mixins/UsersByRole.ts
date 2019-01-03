import { Component, Vue } from "vue-property-decorator";
import fb from "@/firebaseApp";
import { IUser } from "@/types/Users";

const filteredStatus = ["Lost", "Opted out", "Incorrect", "Duplicate"];

@Component
export default class UserByRole extends Vue {
  users: IUser[] | null = null;
  usersBindName: string = "users";
  usersRole: string | null = null;

  getUsers() {
    if (!this.usersRole) throw new Error("Must select a role");
    this.$bindAsArray(
      this.usersBindName,
      fb
        .database()
        .ref("/users")
        .orderByChild(`roles/${this.usersRole}`)
        .equalTo(true),
      null,
      this.filterUsers
    );
  }

  filterUsers() {
    if (this.users) {
      this.users = this.users.reduce(
        (users: IUser[], { status = "lost", ...other }) => {
          const user = { status, ...other };
          if (!filteredStatus.includes(status)) {
            users.push(user);
          }
          if (this.$route.query.emailAddress === other.emailAddress)
            this.allotment.assignee = user;
          return users;
        },
        []
      );
    }
  }
}
