module.exports = {
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
