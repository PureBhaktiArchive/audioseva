/// sri sri guru gauranga jayatah
/// Srila Gurudeva ki jaya!

function getAvailableLists() {
  var allotmentsSpreadsheet = SpreadsheetApp.openById('116XUu4osXhMwLL6HvsEIxop8Iopr2B6ohAKilQxfdTw');
  var sheet = allotmentsSpreadsheet.getSheetByName('Allotments');

  var data = sheet
  .getDataRange()
  .getValues()
  .filter(function(row){
    return row[4] === ""; // Only spare
  })
  .map(function(row) { return row[12]; })
  .filter(function (value, index, self) {
    return self.indexOf(value) === index; // Unique
  })
  .sort(function(a,b) {
    return b === "Test" ? -1 : 0;
  });

  return data;
}

function getOutput() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("lists");
  if (cached != null)
    return cached;

  var output = JSON.stringify(getAvailableLists());
  cache.put("lists", output, 3600);
  return output;
}

function doGet(e) {
  Logger.log(e);
  return ContentService.createTextOutput(e.parameters.callback + '(' + getOutput() + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
