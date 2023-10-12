const crypto = require('crypto');

/**
 * The MD4 algorithm is not available anymore in Node.js 17+ (because of library SSL 3).
 * In that case, silently replace MD4 by the MD5 algorithm.
 * From https://stackoverflow.com/a/72219174/3082178.
 * Just setting webpack's `output.hashFunction` is not enough,
 * something else is using MD4 (see https://stackoverflow.com/questions/69692842/error-message-error0308010cdigital-envelope-routinesunsupported/73465262#comment131441027_73465262).
 */
try {
  crypto.createHash('md4');
} catch (e) {
  console.warn(
    'Crypto "MD4" is not supported anymore by this Node.js version. Using MD5 instead.'
  );
  const origCreateHash = crypto.createHash;
  crypto.createHash = (alg, opts) =>
    origCreateHash(alg === 'md4' ? 'md5' : alg, opts);
}

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
