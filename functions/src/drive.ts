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

const getDriveApi = async () =>
  google.drive({
    version: 'v3',
    auth: await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/drive'],
    }),
  });

export const listDriveFiles = async (driveId: string, queries: string[]) =>
  unwrapGaxiosResponse(
    await (
      await getDriveApi()
    ).files.list({
      driveId,
      corpora: 'drive',
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
    await (
      await getDriveApi()
    ).files.create({
      supportsAllDrives: true,
      requestBody: { name, parents: [parentId], mimeType },
      fields: 'id, webViewLink',
    })
  );
