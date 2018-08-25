export class DriveUtils {
  static getOrCreateSubfolder(folder, name) {
    const subfolders = folder.getFoldersByName(name);
    return subfolders.hasNext() ? subfolders.next() : folder.createFolder(name);
  }

  static moveFile(file, to) {
    const parents = file.getParents();
    while (parents.hasNext()) parents.next().removeFile(file);

    to.addFile(file);
  }

  static removeAllFiles(folder, fileName) {
    const files = folder.getFilesByName(fileName);
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
  }
}
