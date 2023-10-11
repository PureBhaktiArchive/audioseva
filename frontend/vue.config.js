module.exports = {
  configureWebpack: {
    output: {
      hashFunction: 'xxhash64',
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
