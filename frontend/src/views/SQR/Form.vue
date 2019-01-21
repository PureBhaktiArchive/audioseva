<template>
  <div>
    <v-container>
      <h2>Sound Quality Report for {{ $route.params.fileName }}</h2>
    </v-container>
    <v-form>
      <v-container>
        <v-layout wrap>
          <v-flex xs6 v-for="(label, index) in cancelFields" :key="label">
            <v-list>
              <v-list-group @click="handleListClick(index + 1)" :value="cancel === index + 1" no-action>
                <v-list-tile slot="activator">
                  <v-list-tile-content>
                    <v-list-tile-title :style="{ height: 'auto' }">
                      <v-checkbox
                        :checked="cancel === index + 1"
                        :value="cancel === index + 1"
                        :label="label"
                      >
                      </v-checkbox>
                    </v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
                <div class="pa-1">
                  <v-textarea v-model="cancelComments[index + 1]" box>
                  </v-textarea>
                  <v-btn>Cancel</v-btn>
                </div>
              </v-list-group>
            </v-list>
          </v-flex>
          <template v-if="!cancel">
            <v-flex>
              <v-text-field label="A. Audio File Name" disabled :value="$route.params.fileName">
              </v-text-field>
            </v-flex>
          </template>
        </v-layout>
      </v-container>
    </v-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component({
  name: "Form"
})
export default class Form extends Vue {
  fields = [];
  cancelFields = [
    "I'm unable to play or download the audio",
    "The alloted lecture is not in my preferred language"
  ];
  cancel = null;
  cancelComments = {};

  handleListClick(cancelField: number) {
    this.cancel = this.cancel === cancelField ? null : cancelField;
  }
}
</script>

<style scoped>
</style>
