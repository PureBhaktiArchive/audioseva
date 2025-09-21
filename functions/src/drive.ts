import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

export enum MimeTypes {
  Folder = 'application/vnd.google-apps.folder',
  Document = 'application/vnd.google-apps.document',
}

export const Queries = {
  mimeTypeIs: (mime: MimeTypes) => `mimeType = '${mime}'`,
  parentIs: (id: string) => `'${id}' in parents`,
  nameIs: (name: string) => `name = '${name}'`,
  notTrashed: 'trashed = false',
};

const drive = google.drive({
  version: 'v3',
  auth: new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
  }),
});

export const listDriveFiles = async (queries: string[]) =>
  (
    await drive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: queries.join(' and '),
      fields: 'nextPageToken, files(id, name, webViewLink)',
    })
  ).data.files;

export const createDriveFile = (
  name: string,
  mimeType: MimeTypes,
  parentId: string
) =>
  drive.files
    .create({
      supportsAllDrives: true,
      requestBody: { name, parents: [parentId], mimeType },
      fields: 'id, webViewLink',
    })
    .then((response) => response.data);

export const listPermissions = async (fileId: string) =>
  (
    await drive.permissions.list({
      supportsAllDrives: true,
      fileId,
      fields: 'permissions(id,type,permissionDetails,emailAddress,role)',
    })
  ).data.permissions;

export const createPermission = async (
  fileId: string,
  emailAddress: string,
  role: string
) =>
  drive.permissions
    .create({
      supportsAllDrives: true,
      fileId,
      sendNotificationEmail: false,
      requestBody: {
        type: 'user',
        emailAddress,
        role,
      },
      fields: 'id',
    })
    .then((response) => response.data);

export const deletePermission = (fileId: string, permissionId: string) =>
  drive.permissions
    .delete({
      supportsAllDrives: true,
      fileId,
      permissionId,
    })
    .then((response) => response.data);

export const updatePermission = (
  fileId: string,
  permissionId: string,
  role: string,
  expirationTime: DateTime
) =>
  drive.permissions
    .update({
      supportsAllDrives: true,
      fileId,
      permissionId,
      requestBody: {
        role,
        expirationTime: expirationTime.toISO(),
      },
    })
    .then((response) => response.data);
