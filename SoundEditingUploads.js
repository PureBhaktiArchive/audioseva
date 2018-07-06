/// sri sri guru gauranga jayatah
/// Srila Gurudeva ki jaya!

function watchUploads() {
  /// SERIES-SERIAL-PART[-vN.M (DESCRIPTION)].mp3/wav
  var FILE_NAME_PATTERN = /^(\w+-\d+-\d+)(?:\.|\s*)v(\d+)(?:[\.\s]*(.+))?\.\w{3}$/;
  var SPREADHSHEETS = {
    Isa: "13JBF8iyfY1glFPyUAAVKXOLtcop-1YO3oPZEb68vMfI",
    Test: "",
  };

  var uploadsFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("soundEditing.uploadsFolderId"));
  var qcFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("soundEditing.QCFolderId"));

  var search = '"' + uploadsFolder.getId() + '" in parents';
  var files = DriveApp.searchFiles(search);

  var incorrectFiles = [];

  var tasksTable = new Table(SpreadsheetApp.openById(SPREADHSHEETS.Isa)
    .getSheetByName("Tasks")
    .getDataRange()
  );

  while (files.hasNext()) {

    var file = files.next();
    var fileName = file.getName();

    var nameMatch = fileName.match(FILE_NAME_PATTERN);
    if (!nameMatch) {
      console.log("%s does not match the file name convention.", fileName);
      incorrectFiles.push(file);
      continue;
    }

    var baseName = nameMatch[1];
    var versionNumber = nameMatch[2];
    var description = nameMatch[3];

    var task = tasksTable.select({"Output Audio File Name": baseName}).first();

    if (!task) {
      console.log("%s is not found among tasks.", baseName);
      incorrectFiles.push(file);
      continue;
    }

    var latestVersion = task.getFieldValue("Latest Version");
    if (versionNumber <= latestVersion) {
      console.log("%s is skipped, v%s was already processed.", fileName, latestVersion);
      incorrectFiles.push(file);
      continue;
    }

    console.log("Setting last version of %s from %s to %s", baseName, latestVersion, versionNumber);
    task.setFieldValue("Latest Version", versionNumber);
    task.commitFieldValue("Latest Version");

    if (task.getFieldValue("Status") == "Given") {
      console.log("Setting status of %s to WIP", baseName);
      task.setFieldValue("Status", "WIP");
      task.commitFieldValue("Status");
    }

    console.log("Moving %s from %s to %s", fileName, uploadsFolder.getName(), qcFolder.getName());
    qcFolder.addFile(file);
    uploadsFolder.removeFile(file);
  }


  Logger.log(incorrectFiles);
}

