/* eslint no-extend-native: "off" */
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function startsWith(search, pos) {
    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
}
