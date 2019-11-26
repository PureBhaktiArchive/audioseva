<template>
  <v-col>
    <v-row>

      <v-col class="my-2" cols="12">
        <h3>B. Sound Quality Rating</h3>
        <s-q-r-field :form="form" :updateForm="updateForm"></s-q-r-field>
        <guidelines>
          <p>
            Please rate the overall sound quality of the allotted file by selecting one of the options:
            Good, Average, Bad, Entire file is Inaudible, Entire file is Blank. The basis of rating will be the
            audibility of Srila Gurudeva’s voice. In other words, if you find it difficult or strenuous to understand
            what Srila Gurudeva is speaking, due to too much background noise or volume being too low and so on,
            please choose ‘Bad’. On the other hand, if the audio is clear, with no background noise and good volume,
            please choose ‘Good.’ In cases where you can hear Srila Gurudeva well but
            there is some sound issue also, choose ‘Average’. This will help us decide which SE to allot the file to.
          </p>
        </guidelines>
      </v-col>

      <v-col class="my-2" cols="12">
        <h3>C. Unwanted parts to be cut</h3>
        <unwanted-parts :form="form" :updateForm="updateForm" :removeField="removeField"></unwanted-parts>
        <guidelines>
          For each unwanted part you identify, please fill details in one such block.

          <ul>
            <li>
              Please note: The timing is to be filled in (h:)mm:ss format
            </li>
            <li>
              Also, please mention the Beginning and Ending time for
              each such unwanted part
            </li>
            <li>
              For e.g. If from 20 minutes and 10 seconds to 21 minutes and 20 seconds there is
              an abrupt blank space, please write 20:10 in the ‘Beginning field’ and 21:20 in the Ending field. Choose
              ‘Blank Space’ in Type and provide a relevant details in the Description field
            </li>
            <li>
              For the next unwanted part, please add another such block.
            </li>
            <li>
              Add block by clicking on the green button ‘+ UNWANTED PART’.
            </li>
            <li>
              Delete a block by clicking the red 'Bin' icon on the top right of each block.
            </li>
          </ul>
        </guidelines>
      </v-col>

      <v-col class="my-2" cols="12">
        <h3>D. Sound issues</h3>
        <sound-issues :form="form" :updateForm="updateForm" :removeField="removeField"></sound-issues>
        <guidelines>
          For every issue you wish to report for the SE’s attention, please fill this part as follows.

          <ul>
            <li>
              Enter the Beginning and Ending timing of the section in (h:)mm:ss format.
              - Choose the specific issue from the options listed or enter a different issue by selecting ‘Other’.
            </li>
            <li>
              Please describe the issue in the ‘Description’ field.
            </li>
            <li>
              For instance, from 20:20 - 21:34 if there is loud noise of roadside vehicles, making it difficult to hear
              what Srila Gurudeva is speaking, then please write ‘20:20’ in the Beginning field and ‘21:34’ in the Ending
              field. Choose the option ‘Background noise’ in Type and in ‘Description’ field, write ‘Sound of vehicles
              honking and general traffic noise.’
            </li>
            <li>
              Add block by clicking on the green button ‘+ SOUND ISSUE’.
            </li>
            <li>
              Delete a block by clicking the red 'Bin' icon on the top right of each block.
            </li>
          </ul>
        </guidelines>
      </v-col>

      <v-col class="my-2" cols="12">
        <h3>E. Total Duration of the Recording</h3>
        <duration :form="form" :updateForm="updateForm" :removeField="removeField"></duration>
        <guidelines>
          <p>
            Here, we simply want to know how much the tape has relevant recording.
            In other words, whether any part of the sound file is blank or inaudible and hence to be discarded.
            Usually such parts are present towards the end of the file. There might be small parts 5-7 min long
            in between two lecture recordings, but these can be ignored. Please write the beginning and ending timings
            of the overall recording in this field in (h:)mm:ss format.
          </p>
        </guidelines>
      </v-col>

      <v-col class="my-2" cols="12">
        <h3>F. Comments</h3>
        <text-area
          :form="form"
          :updateForm="updateForm"
          :removeField="removeField"
          pathOverride="comments"
          :fieldProps="{
            filled: true,
            outlined: true,
            required: true
          }"
        ></text-area>
        <guidelines>
          <ul>
            <li>
              Is there any issue with the overall sound quality? E.g. Background hum throughout, vehicle sound throughout
              the tape, sound of the fan or wind, low volume, etc. Please provide these details here.
            </li>
            <li>
              Any other comments you wish to provide can be filled here.
            </li>
          </ul>
        </guidelines>
      </v-col>

    </v-row>
  </v-col>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import SoundIssues from "@/components/SQRForm/SoundIssues.vue";
import UnwantedParts from "@/components/SQRForm/UnwantedParts.vue";
import SQRField from "@/components/SQRForm/SQRField.vue";
import Duration from "@/components/SQRForm/Duration.vue";
import TextArea from "@/components/Inputs/TextArea.vue";
import Guidelines from "@/components/SQRForm/Guidelines.vue";

@Component({
  name: "Fields",
  components: {
    SoundIssues,
    UnwantedParts,
    SQRField,
    Duration,
    TextArea,
    Guidelines
  }
})
export default class Fields extends Vue {
  @Prop() form!: { [key: string]: any };
  @Prop() removeField!: (field: string) => void;
  @Prop()
  updateForm!: (field: string, value: any, debounceSubmit: boolean) => void;
}
</script>

<style scoped>
</style>
