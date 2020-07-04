<template>
  <v-container>
    <div class="px-1 pb-3">
      <h2>{{ $title }}</h2>
    </div>
    <v-form ref="form" @submit.prevent="submitForm">
      <v-row>
        <!-- Date -->
        <v-col
          cols="12"
          sm="5"
          class="d-flex pa-1 pl-0"
          :style="{ flexDirection: 'column', flexWrap: 'wrap' }"
        >
          <v-row no-gutters>
            <v-col cols="12" class="pa-0">
              <v-text-field
                outlined
                @click:prepend-inner="menu = !menu"
                prepend-inner-icon="$vuetify.icons.event"
                v-model="form.date"
                label="Date"
              />
            </v-col>
            <v-col cols="7" class="pa-0">
              <v-menu
                :style="{ height: '100%', width: '100%' }"
                ref="menu"
                v-model="menu"
                :close-on-content-click="false"
                :return-value.sync="date"
              >
                <v-date-picker v-model="form.date" no-title scrollable>
                  <v-spacer></v-spacer>
                  <v-btn text color="primary" @click="menu = false"
                    >Cancel</v-btn
                  >
                  <v-btn
                    text
                    color="primary"
                    @click="$refs.menu.save(form.date)"
                    >OK</v-btn
                  >
                </v-date-picker>
              </v-menu>
            </v-col>
          </v-row>
        </v-col>
        <!-- End Date -->

        <!-- Currency information -->
        <v-col class="d-flex pa-0" cols="12" sm="7">
          <v-row no-gutters>
            <v-col cols="4" sm="4" md="3" lg="2" class="py-1">
              <v-combobox
                class="currency"
                outlined
                label="Currency"
                v-model="form.sum.currency"
                :items="currencies"
              />
            </v-col>
            <v-col cols="8" sm="8" md="9" lg="10" class="py-1 pr-1">
              <v-text-field
                class="amount"
                :rules="amountRules"
                outlined
                label="Amount"
                v-model="form.sum.amount"
              />
            </v-col>
          </v-row>
        </v-col>
        <!-- End Currency information -->

        <v-col cols="12" lg="6" class="pa-0 pr-lg-2">
          <v-row>
            <!-- Name -->
            <v-col cols="12" sm="5" lg="6" class="py-0 pr-lg-1">
              <v-text-field
                :rules="rules"
                outlined
                label="Name"
                v-model="form.donor.name"
              />
            </v-col>
            <!-- Email -->
            <v-col cols="12" sm="7" lg="6" class="py-0 pl-lg-2 pr-lg-2">
              <v-text-field
                :rules="emailRules"
                outlined
                label="Email Address"
                v-model="form.donor.emailAddress"
              />
            </v-col>
          </v-row>
        </v-col>

        <!-- Phone information -->
        <v-col cols="12" lg="6" class="pa-0">
          <v-row no-gutters>
            <v-col cols="5" sm="4" md="3" lg="4" class="pr-sm-0 py-0">
              <v-text-field
                class="currency country-code"
                outlined
                label="Country code"
                v-model="phoneData.countryCode"
              />
            </v-col>
            <v-col cols="7" sm="8" md="9" lg="8" class="pl-0 py-0">
              <v-text-field
                class="amount"
                outlined
                label="Phone number"
                v-model="phoneData.phoneNumber"
              />
            </v-col>
          </v-row>
        </v-col>
        <!-- End Phone information -->

        <!-- Collected by -->
        <v-col cols="12" class="pa-0">
          <v-text-field
            :rules="rules"
            outlined
            label="Collected By"
            v-model="form.collectedBy"
          />
        </v-col>

        <!-- Comment -->
        <v-col cols="12" class="pa-0">
          <v-textarea outlined label="Comment" v-model="form.comment" />
        </v-col>

        <v-btn
          :loading="isSubmitting"
          :disabled="isSubmitting"
          type="submit"
          color="success"
          class="ml-1"
        >
          Submit
        </v-btn>

        <span
          :style="{ color: submissionStatus === 'success' ? '#4caf50' : 'red' }"
          class="d-flex align-center ml-1"
        >
          {{ submissionMessage }}
        </span>
      </v-row>
    </v-form>
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import firebase from 'firebase/app';
import 'firebase/database';

@Component({
  name: 'DonationReceiptForm',
  title: 'Donation Receipt Form',
})
export default class DonationForm extends Vue {
  date = new Date().toISOString().substr(0, 10);
  currencies = ['INR', 'USD', 'EUR', 'RUB', 'AUD', 'YEN', 'BRL'];
  menu = false;
  amountRules = [(v: string) => (v && !!v.match(/^\d*$/)) || 'Numbers only'];
  emailRules = [
    (value: string) => {
      if (value && value.length > 0) {
        const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return pattern.test(value) || 'Invalid e-mail';
      }
      return 'Required email';
    },
  ];
  rules = [(v: string) => (v && v.length > 0) || 'Required'];
  form = {
    date: new Date().toISOString().substr(0, 10),
    donor: {
      phoneNumber: '',
    },
    sum: {
      currency: 'INR',
    },
    collectedBy: '',
    comment: '',
  };
  phoneData = {
    countryCode: '',
    phoneNumber: '',
  };
  isSubmitting = false;
  submissionStatus = '';

  getSubmissionData() {
    return {
      ...this.form,
      donor: {
        ...this.form.donor,
        phoneNumber: this.phoneNumber,
      },
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      token: this.$route.params.token,
    };
  }

  get phoneNumber() {
    return `+${this.phoneData.countryCode} ${this.phoneData.phoneNumber}`;
  }

  get submissionMessage() {
    let message = '';
    if (this.submissionStatus === 'success') {
      message = 'Submission successful';
    } else if (this.submissionStatus === 'error') {
      message = 'Submission error';
    }
    return message;
  }

  clearForm() {
    if (this.submissionStatus === 'success') {
      (this.$refs.form as any).resetValidation();
      this.form = {
        ...this.form,
        donor: {
          phoneNumber: '',
        },
        sum: {
          currency: 'INR',
        },
        comment: '',
      };
      this.phoneData = {
        countryCode: '',
        phoneNumber: '',
      };
    }
  }

  async submitForm() {
    if (this.isSubmitting) return;
    this.submissionStatus = '';
    const data = this.getSubmissionData();
    if ((this.$refs.form as any).validate()) {
      this.isSubmitting = true;
      await firebase
        .database()
        .ref('/donations/cash')
        .push()
        .set(data)
        .catch(() => {
          this.submissionStatus = 'error';
        });
      if (!this.submissionStatus) this.submissionStatus = 'success';
      this.clearForm();
    }
    this.isSubmitting = false;
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
  min-height: 60px !important;
}

>>> .country-code .v-label {
  max-width: 100%;
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

@media screen and (max-width: 371px) {
  >>> .country-code .v-label {
    font-size: 14px;
  }
}
</style>
