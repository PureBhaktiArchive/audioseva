Vue.component('v-select', VueSelect.VueSelect);
Vue.use(vueJsonp);

var router = new VueRouter({
  mode: 'history',
  routes: [],
});

var app = new Vue({
  router,
  el: '#app',
  data: {
    devotees: [],
    languages: ['English', 'Hindi', 'Bengali', 'None'],
    lists: null,
    files: null,
    loading: false,
    filesSelector: {
      languages: [],
      list: null,
      count: 50,
    },
    allotment: {
      devotee: null,
      repeated: false,
      files: [],
      comment: null,
    },
    submissionStatus: null,
  },
  mounted: function () {
    this.$http
      .get('https://hook.integromat.com/41xuikkmbdo2ql56g6uwkxb656hp0zj4')
      .then((response) => {
        this.devotees = response.data;
        if (this.$route.query.emailaddress) {
          this.allotment.devotee = this.devotees.find(
            (devotee) => devotee.emailaddress == this.$route.query.emailaddress
          );
          this.allotment.repeated = true;
        }
      });
    this.$jsonp(
      'https://script.google.com/macros/s/AKfycbwUx5nYP13bZbRiIHPB5LaJjROTPR9zuz-HzxLmS4L5DccH65s/exec'
    ).then((data) => {
      this.lists = data;
    });

    this.filesSelector.languages = this.languages;
  },
  methods: {
    allot: function () {
      this.submissionStatus = 'inProgress';
      this.$http
        .post(
          'https://hook.integromat.com/91s84ercu7gsom8gnz69w7b4o632217a',
          this.allotment
        )
        .then(
          (data) => {
            this.submissionStatus = 'complete';
          },
          (response) => {}
        );
    },
    reset: function () {
      this.allotment = {
        devotee: null,
        repeated: false,
        files: [],
        comment: null,
      };
      this.filesSelector = {
        languages: [],
        list: null,
        count: 50,
      };
      this.files = null;
      this.submissionStatus = null;
    },
  },
  watch: {
    'allotment.devotee': function (newValue, oldValue) {
      if (newValue == null) return;

      this.filesSelector.languages = this.languages;
    },
    filesSelector: {
      handler: _.debounce(function (val, oldVal) {
        this.files = null;
        this.allotment.files = [];

        if (
          this.filesSelector.languages.length === 0 ||
          this.filesSelector.list == null
        )
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
      }, 1000),
      deep: true,
    },
  },
  computed: {},
});
