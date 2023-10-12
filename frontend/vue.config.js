const crypto = require('crypto');

/**
 * The MD4 algorithm is not available anymore in Node.js 17+ (because of library SSL 3).
 * In that case, silently replace MD4 by the MD5 algorithm.
 */
try {
  crypto.createHash('md4');
} catch (e) {
  console.warn('Crypto "MD4" is not supported anymore by this Node.js version');
  const origCreateHash = crypto.createHash;
  crypto.createHash = (alg, opts) => {
    console.log(`Creating an ${alg} hash`);
    return origCreateHash(alg === 'md4' ? 'md5' : alg, opts);
  };
}

module.exports = {
  configureWebpack: (config) => {
    console.log('Original hash function is', config.output.hashFunction);
    // https://github.com/webpack/webpack/issues/14532
    // https://stackoverflow.com/a/73465262/3082178
    config.output.hashFunction = 'md5';
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
