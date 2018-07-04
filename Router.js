/// sri sri guru gauranga jayatah
/// Srila Gurudeva ki jaya!

function doGet(e) {
  return createPageResponse(e.parameter.page || "Index");
}

function createPageResponse(name) {
  return HtmlService.createTemplateFromFile(name)
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    ;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

