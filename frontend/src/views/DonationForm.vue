<template>
  <v-container>
    <div class="px-1 pb-3">
      <h2>Donation Receipt form</h2>
    </div>
    <v-form ref="form" @submit.prevent="submitForm">
      <v-layout row wrap>
        <v-flex xs12 sm5 class="d-flex pa-1" :style="{ flexDirection: 'column', flexWrap: 'wrap' }">
          <v-flex xs12>
            <v-text-field
              outline
              @click:prepend-inner="menu = !menu"
              prepend-inner-icon="$vuetify.icons.event"
              v-model="form.date"
              label="Date"
            />
          </v-flex>
          <v-flex xs7>
            <v-menu
              :style="{ height: '100%', width: '100%' }"
              ref="menu"
              v-model="menu"
              :close-on-content-click="false"
              :return-value.sync="date"
            >
              <div slot="activator">
              </div>
              <v-date-picker v-model="form.date" no-title scrollable>
                <v-spacer></v-spacer>
                <v-btn flat color="primary" @click="menu = false">Cancel</v-btn>
                <v-btn flat color="primary" @click="$refs.menu.save(form.date)">OK</v-btn>
              </v-date-picker>
            </v-menu>
          </v-flex>
        </v-flex>
        <v-flex xs12 sm7>
          <v-flex xs4 sm4 md3 lg2 class="py-1 pl-1">
            <v-combobox
              class="currency"
              outline
              label="Currency"
              v-model="form.sum.currency"
              :items="currencies"
            >
            </v-combobox>
          </v-flex>
          <v-flex xs8 sm8 md9 lg10 class="py-1 pr-1">
            <v-text-field class="amount" :rules="amountRules" outline label="Amount" v-model="form.sum.amount" />
          </v-flex>
        </v-flex>
        <v-flex xs12 sm6 lg4 class="pa-1">
          <v-text-field :rules="rules" outline label="Name" v-model="form.donor.name" />
        </v-flex>
        <v-flex xs12 sm6 lg4 class="pa-1">
          <v-text-field
            :rules="emailRules"
            outline
            label="Email Address"
            v-model="form.donor.emailAddress"
          />
        </v-flex>
        <v-flex xs12 lg4 class="d-flex" :style="{ flexDirection: 'row', flexWrap: 'wrap', padding: '4px 4px 4px 4px' }">
          <vue-phone-number-input
            :class="{ 'mb-2': true, 'phone-error': phoneError }"
            @update="handleUpdatePhone"
            :style="{ width: '100%' }"
            no-flags
            v-model="form.donor.phoneNumber"
            required
            no-validator-state
            no-use-browser-locale
          />
          <div class="phone-error-message">{{ phoneError }}</div>
        </v-flex>
        <v-flex xs12 class="pa-1">
          <v-text-field :rules="rules" outline label="Collected By" v-model="form.collectedBy" />
        </v-flex>
        <v-flex xs12 class="pa-1">
          <v-textarea outline label="Comment" v-model="form.comment" />
        </v-flex>
        <v-btn :loading="isSubmitting" :disabled="isSubmitting" type="submit" color="success">Submit</v-btn>
        <span
          :style="{ color: submissionStatus === 'success' ? '#4caf50' : 'red'}"
          class="d-flex align-center"
        >
          {{ submissionMessage }}
        </span>
      </v-layout>
    </v-form>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import firebase from "firebase/app";
import fb from "../firebaseApp";
import VuePhoneNumberInput from "vue-phone-number-input";
import "vue-phone-number-input/dist/vue-phone-number-input.css";

@Component({
  name: "DonationForm",
  components: { VuePhoneNumberInput }
})
export default class DonationForm extends Vue {
  date = new Date().toISOString().substr(0, 10);
  currencies = ["INR", "USD", "EUR", "RUB", "AUD", "YEN"];
  menu = false;
  amountRules = [(v: string) => (v && !!v.match(/^\d*$/)) || "Numbers only"];
  emailRules = [
    (value: string) => {
      if (value && value.length > 0) {
        const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return pattern.test(value) || "Invalid e-mail";
      }
      return "Required email";
    }
  ];
  rules = [(v: string) => (v && v.length > 0) || "Required"];
  form = {
    date: new Date().toISOString().substr(0, 10),
    donor: {
      phoneNumber: ""
    },
    sum: {
      currency: "INR"
    },
    collectedBy: "",
    comment: ""
  };
  phone = null;
  validPhone = false;
  phoneError = "";
  isSubmitting = false;
  submissionStatus = "";

  getSubmissionData() {
    return {
      ...this.form,
      donor: {
        ...this.form.donor,
        phoneNumber: this.phone
      },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      token: this.$route.params.token
    };
  }

  validatePhone() {
    if (this.validPhone) {
      this.phoneError = "";
      return true;
    } else {
      this.phoneError = "Invalid phone";
      return false;
    }
  }

  get submissionMessage() {
    let message = "";
    if (this.submissionStatus === "success") {
      message = "Submission successful";
    } else if (this.submissionStatus === "error") {
      message = "Submission error";
    }
    return message;
  }

  clearForm() {
    if (this.submissionStatus === "success") {
      (this.$refs.form as any).resetValidation();
      this.form = {
        ...this.form,
        donor: {
          phoneNumber: ""
        },
        sum: {
          currency: "INR"
        },
        comment: ""
      };
    }
  }

  async submitForm() {
    if (this.isSubmitting) return;
    this.submissionStatus = "";
    const data = this.getSubmissionData();
    const isValidForm = (this.$refs.form as any).validate();
    const isValidPhone = this.validatePhone();
    if (isValidForm && isValidPhone) {
      this.isSubmitting = true;
      await fb
        .database()
        .ref("/donations/cash")
        .push()
        .set(data)
        .catch(() => {
          this.submissionStatus = "error";
        });
      if (!this.submissionStatus) this.submissionStatus = "success";
      this.clearForm();
    }
    this.isSubmitting = false;
  }

  handleUpdatePhone(phone: any) {
    this.validPhone = phone.isValid;
    this.validatePhone();
    if (phone.formatInternational) {
      this.phone = phone.formatInternational;
    }
  }
}
</script>

<style scoped>
.phone-error-message {
  min-height: 16px;
  color: #ff5252;
  margin-bottom: 8px;
  padding: 0 12px;
  font-size: 12px;
}

>>> .field .field-input {
  border: 2px solid rgba(0, 0, 0, 0.54);
  min-height: 60px;
}
>>> .phone-error .field .field-input {
  border: 2px solid #ff5252;
}
>>> .v-input__slot {
  min-height: 60px;
}
>>> .amount .v-input__slot {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

>>> .currency .v-input__slot {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}
</style>
