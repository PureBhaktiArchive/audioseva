module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    "plugin:vue/essential",
    "@vue/prettier",
    "@vue/typescript",
    "prettier"
  ],
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "object-curly-spacing": ["error", "always"],
    "vuetify/no-deprecated-classes": "error",
    "vuetify/grid-unknown-attributes": "error",
    "vuetify/no-legacy-grid": "error"
  },
  parserOptions: {
    parser: "@typescript-eslint/parser"
  },
  plugins: ["vuetify", "@typescript-eslint"]
};
