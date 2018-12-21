// General Helper Functions
export const extractListFromFilename = fileName => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};
