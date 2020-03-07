import { subjects } from "@/abilities";

declare module "vue/types/vue" {
  interface Vue {
    $subjects: typeof subjects;
  }
}
