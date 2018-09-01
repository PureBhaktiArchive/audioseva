module.exports = {
  root: true,
  parser: 'babel-eslint',
  extends: ['eslint:recommended', 'airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['prettier', 'googleappsscript'],
  env: {
    es6: true,
    'googleappsscript/googleappsscript': true
  },
  rules: {
    'prettier/prettier': 'warn',
    'import/prefer-default-export': 0,
    'linebreak-style': ['error', 'windows'],
    'no-continue': ['warn'],
    'no-console': 'off'
  },
  globals: {
    CardService: true,
    Gmail: true,
    Drive: true,
    OAuth1: true,
    OAuth2: true,
    FirebaseApp: true,
    Sheetfu: true
  }
};
