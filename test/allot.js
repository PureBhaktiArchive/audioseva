Vue.component('v-select', VueSelect.VueSelect);

var app = new Vue({
  el: '#app',
  data: {
    devotees: [],
    languages: ["English", "Hindi", "Bengali"],
    files: null,
    loading: false,
    allotment: {
      devotee: null,
      repeated: false,
      language: null,
      files: [],
      comment: null
    }
  },
  mounted: function() {
    this.$http.get('https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4').then((response) => {
      this.devotees = response.data;
    });
  },
  methods: {
    allot: function() {
      this.$http.post(
        "https://hook.integromat.com/91s84ercu7gsom8gnz69w7b4o632217a",
        this.allotment)
        .then((data) => {});
    }
  },
  watch: {
    'allotment.devotee': function(newValue, oldValue) {
      if (newValue == null)
        return;

      for (var language of this.languages) {
        if (newValue.languages.includes(language))
          this.allotment.language = language;
      }

    },
    'allotment.language': function() {
      this.loading = true;
      this.files = null;
      this.allotment.files = [];
      this.$http.get('https://hook.integromat.com/kajqd3givp1odto4wm9w4dpb08wauhff', {
        params: {
          language: this.allotment.language,
          count: 20,
        }
      }).then((response) => {
        this.loading = false;
        this.files = response.data;
      });
    },
  },
  computed: {}
});
