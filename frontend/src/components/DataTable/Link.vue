<template>
  <router-link v-bind="routerLinkProps" :to="link">{{ text }}</router-link>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "Link"
})
export default class Link extends Vue {
  @Prop() item!: any;
  @Prop() value!: any;
  @Prop({ default: () => ({}) })
  routerLinkProps!: { [key: string]: any };
  @Prop() to!: (item: any, value: any) => string | string;
  @Prop() linkText!: (item: any, value: any) => string | string;

  get link() {
    return typeof this.to === "function"
      ? this.to(this.item, this.value)
      : this.to;
  }

  get text() {
    return typeof this.linkText === "function"
      ? this.linkText(this.item, this.value)
      : this.linkText;
  }
}
</script>

<style scoped></style>
