module.exports = {
  configureWebpack: {
    output: {
      // https://github.com/webpack/webpack/issues/14532
      // https://stackoverflow.com/a/73465262/3082178
      hashFunction: 'md5',
    },
  },
  chainWebpack: (config) => {
    config.plugins.delete('prefetch');
  },
  transpileDependencies: [
    'vue-page-title',
    'vuetify',
    'vue2-dropzone',
    'firebaseui',
  ],
};
