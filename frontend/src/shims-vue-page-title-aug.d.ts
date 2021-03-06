import Vue from 'vue';

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    title?: ((instance: V) => string) | string;
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    $title: string;
  }
}
