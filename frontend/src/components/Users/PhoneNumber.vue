<template>
  <div>
    {{ item.phoneNumber }}
    <v-chip small v-if="item.isAvailableOnWhatsApp" color="green">
      <span class="white--text">WhatsApp</span>
    </v-chip>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "PhoneNumber",
})
export default class PhoneNumber extends Vue {
  @Prop() item!: any;
}
</script>

<style scoped></style>
