<template>
  <v-list-group v-bind="$attrs" @click="$emit('click')">
    <template v-slot:activator>
      <v-list-item :style="styles">
        <v-list-item-content>
          <v-list-item-title :style="{ height: 'auto' }">
            {{ header }}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </template>
    <div :style="{ border: styles.border }" class="pa-1">
      <v-checkbox
        class="pa-2"
        @change="handleChange"
        :value="selected"
        :label="label"
      >
      </v-checkbox>
      <div v-if="selected">
        <v-textarea
          :placeholder="placeholder"
          label="Comment"
          outlined
          class="pa-2"
          :rules="rules"
          :value="value"
          @input="handleTextChange"
          filled
        >
        </v-textarea>
        <v-btn type="submit">Confirm</v-btn>
      </div>
    </div>
  </v-list-group>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  name: 'CancelListItem',
})
export default class CancelListItem extends Vue {
  @Prop() header!: string;
  @Prop() label!: string;
  @Prop() styles!: { [key: string]: any };
  @Prop() placeholder!: string;
  @Prop() selected!: boolean;
  @Prop({ default: () => [] })
  rules!: any[];
  @Prop() value!: any;

  handleChange(selected: boolean) {
    this.$emit('update:selected', selected);
  }

  handleTextChange(text: string) {
    this.$emit('input', text);
  }
}
</script>

<style scoped></style>
