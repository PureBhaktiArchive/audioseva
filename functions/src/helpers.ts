// General Helper Functions
export const extractListFromFilename = (fileName: string): string => {
  return fileName.match(/^[^-]*[^ -]/g)[0];
};
