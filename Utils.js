/// sri sri guru gauranga jayatah
/// Srila Gurudeva ki jaya!

function getHeaderColumnIndexes(range, base) {
  base = (typeof base !== 'undefined') ?  base : 0;

  return range
    .offset(0, 0, 1) //only first row
    .getValues()[0]
    .reduce(function (result, value, index) {
      result[value.toString()] = index + base;
      return result;
    }, {});
}
