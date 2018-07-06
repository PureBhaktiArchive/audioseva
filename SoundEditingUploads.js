/// sri sri guru gauranga jayatah
/// Srila Gurudeva ki jaya!

/// SERIES-SERIAL-PART[-vN.M (DESCRIPTION)].mp3/wav
var FILE_NAME_PATTERN = /^(\w+-\d+-\d+)(?:\.|\s*)v(\d+)(?:[\.\s]*(.+))?\.\w{3}$/;
var SPREADHSHEETS = {
  Isa: "13JBF8iyfY1glFPyUAAVKXOLtcop-1YO3oPZEb68vMfI",
  Test: "",
};

function forEachAudioFile(folder, callback) {
  var files = folder.searchFiles("mimeType contains 'audio'");

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
      console.warn("%s does not match the file name convention.", fileName);
      incorrectFiles.push(file);
      continue;
    }

    var nameComponents = {
      baseName: nameMatch[1],
      versionNumber: nameMatch[2],
      description: nameMatch[3],
    }

    var task = tasksTable.select({
      "Output Audio File Name": nameComponents.baseName
    }).first();

    if (!task) {
      console.warn("%s is not found among tasks.", nameComponents.baseName);
      incorrectFiles.push(file);
      continue;
    }

    callback(file, nameComponents, task)
  }
}

function watchSoundEditingUploads() {
  var properties = PropertiesService.getScriptProperties();

  var uploadsFolder = DriveApp.getFolderById(properties.getProperty("soundEditing.uploadsFolderId"));
  var qcFolder = DriveApp.getFolderById(properties.getProperty("soundEditing.qcFolderId"));

  forEachAudioFile(uploadsFolder, function(file, name, task) {
    var latestVersion = task.getFieldValue("Latest Version");
    if (name.versionNumber <= latestVersion) {
      console.warn("Skipping %s, v%s was already processed.", file.getName(), latestVersion);
      return;
    }

    console.log("Setting last version of %s from %s to %s", task.getFieldValue("Output Audio File Name"), latestVersion, name.versionNumber);
    task.setFieldValue("Latest Version", name.versionNumber);
    task.commitFieldValue("Latest Version");

    if (task.getFieldValue("Status") == "Given") {
      console.log("Setting status of %s to WIP", task.getFieldValue("Output Audio File Name"));
      task.setFieldValue("Status", "WIP");
      task.commitFieldValue("Status");
    }

    console.log("Moving %s from %s to %s", file.getName(), uploadsFolder.getName(), qcFolder.getName());
    qcFolder.addFile(file);
    uploadsFolder.removeFile(file);
  })
}

function moveQualityCheckedAudioFiles() {
  var properties = PropertiesService.getScriptProperties();

  var qcFolder = DriveApp.getFolderById(properties.getProperty("soundEditing.qcFolderId"));
  var doneFolder = DriveApp.getFolderById(properties.getProperty("soundEditing.doneFolderId"));
  var processedFolder = DriveApp.getFolderById(properties.getProperty("soundEditing.processedFolderId"));

  forEachAudioFile(qcFolder, function(file, name, task) {
    if (task.getFieldValue("Latest Feedback") < name.versionNumber)
      return;

    switch (task.getFieldValue("Status")) {
      case "Done":
        console.log("Moving %s from %s to %s", file.getName(), qcFolder.getName(), doneFolder.getName());
        doneFolder.addFile(file);
        qcFolder.removeFile(file);
        break;

      default:
        console.log("Moving %s from %s to %s", file.getName(), qcFolder.getName(), processedFolder.getName());
        processedFolder.addFile(file);
        qcFolder.removeFile(file);
        break;
    }
  })
}
