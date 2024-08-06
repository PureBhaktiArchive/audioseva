import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { unwrapGaxiosResponse } from './gaxios-commons';

export enum MimeTypes {
  Folder = 'application/vnd.google-apps.folder',
  Document = 'application/vnd.google-apps.document',
}

export const Queries = {
  mimeTypeIs: (mime: MimeTypes) => `mimeType = '${mime}'`,
  parentIs: (id: string) => `'${id}' in parents`,
  nameIs: (name: string) => `name = '${name}'`,
};

const drive = google.drive({
  version: 'v3',
  auth: new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
  }),
});

export const listDriveFiles = async (queries: string[]) =>
  unwrapGaxiosResponse(
    await drive.files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: queries.join(' and '),
      fields: 'nextPageToken, files(id, name, webViewLink)',
    })
  ).files;

export const createDriveFile = async (
  name: string,
  mimeType: MimeTypes,
  parentId: string
) =>
  unwrapGaxiosResponse(
    await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name, parents: [parentId], mimeType },
      fields: 'id, webViewLink',
    })
  );

export const listPermissions = async (fileId: string) =>
  unwrapGaxiosResponse(
    await drive.permissions.list({
      supportsAllDrives: true,
      fileId,
      fields: 'permissions(id,type,permissionDetails,emailAddress,role)',
    })
  ).permissions;

export const createPermission = async (
  fileId: string,
  emailAddress: string,
  role: string
) =>
  unwrapGaxiosResponse(
    await drive.permissions.create({
      supportsAllDrives: true,
      fileId,
      requestBody: {
        type: 'user',
        emailAddress,
        role,
      },
      fields: 'id',
    })
  );

export const deletePermission = async (fileId: string, permissionId: string) =>
  unwrapGaxiosResponse(
    await drive.permissions.delete({
      supportsAllDrives: true,
      fileId,
      permissionId,
    })
  );
