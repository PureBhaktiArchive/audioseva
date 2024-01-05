/*!
 * sri sri guru gauranga jayatah
 */

export interface StorageFileReference {
  bucket: string;
  name: string;
  generation: string | number; // Used to refer to the fixed version of the edited file in the cloud bucket
}
