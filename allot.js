Vue.component('v-select', VueSelect.VueSelect);

var router = new VueRouter({
    mode: 'history',
    routes: []
});

var app = new Vue({
  router,
  el: '#app',
  http: {
    emulateJSON: true,
  },
  data: {
    devotees: [],
    languages: ["English", "Hindi", "Bengali", "None"],
    lists: ["ML1", "ML2", "SER", "JAG", "Test"],
    files: null,
    loading: false,
    filesSelector: {
      language: null,
      list: null,
      count: 20,
    },
    allotment: {
      devotee: null,
      repeated: false,
      files: [],
      comment: null
    },
    submissionStatus: null,
  },
  mounted: function() {
    this.$http.get('https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4').then((response) => {
      this.devotees = response.data;
      if (this.$route.query.emailaddress) {
        this.allotment.devotee = this.devotees.find(devotee => devotee.emailaddress == this.$route.query.emailaddress);
        this.allotment.repeated = true;
      }
    });
  },
  methods: {
    allot: function() {
      this.submissionStatus = 'inProgress';
      this.$http
        .post("https://hook.integromat.com/91s84ercu7gsom8gnz69w7b4o632217a", this.allotment)
        .then((data) => {
          this.submissionStatus = 'complete';
        }, response => {

        });
    },
    reset: function () {
      this.allotment = {
        devotee: null,
        repeated: false,
        files: [],
        comment: null,
      };
      this.filesSelector = {
        language: null,
        list: null,
        count: 20,
      };
      this.files = null;
      this.submissionStatus = null;
    },
  },
  watch: {
    'allotment.devotee': function(newValue, oldValue) {
      if (newValue == null)
        return;

      for (var language of this.languages) {
        if (newValue.languages.includes(language))
          this.filesSelector.language = language;
      }

    },
    filesSelector: {
      handler: function(val, oldVal) {
        this.files = null;
        this.allotment.files = [];

        if (this.filesSelector.language == null || this.filesSelector.list == null)
          return;

        this.loading = true;
        this.$http
          .get('https://hook.integromat.com/kajqd3givp1odto4wm9w4dpb08wauhff', {
            params: this.filesSelector,
          })
          .then((response) => {
            this.loading = false;
            this.files = response.data;
          });
      },
      deep: true
    },
  },
  computed: {}
});
