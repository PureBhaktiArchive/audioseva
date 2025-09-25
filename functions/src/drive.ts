import * as functions from 'firebase-functions/v1';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getDomainWideDelegationClient } from './domain-wide-delegation';

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

const getDriveClient = async () =>
  google.drive({
    version: 'v3',
    auth: await getDomainWideDelegationClient(
      functions.config().transcription.coordinator.email_address,
      ['https://www.googleapis.com/auth/drive']
    ),
    adapter(options, defaultAdapter) {
      if (
        options.url.toString().toLowerCase().includes('permissions') &&
        options.method.toUpperCase() === 'PATCH'
      )
        functions.logger.debug('Making a permissions update request', {
          options,
        });
      return defaultAdapter(options);
    },
  });

export const listDriveFiles = async (queries: string[]) =>
  (
    await (
      await getDriveClient()
    ).files.list({
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      q: queries.join(' and '),
      fields: 'nextPageToken, files(id, name, webViewLink)',
    })
  ).data.files;

export const createDriveFile = async (
  name: string,
  mimeType: MimeTypes,
  parentId: string
) =>
  (await getDriveClient()).files
    .create({
      supportsAllDrives: true,
      requestBody: { name, parents: [parentId], mimeType },
      fields: 'id, webViewLink',
    })
    .then((response) => response.data);

export const listPermissions = async (fileId: string) =>
  (
    await (
      await getDriveClient()
    ).permissions.list({
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
  (await getDriveClient()).permissions
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

export const deletePermission = async (fileId: string, permissionId: string) =>
  (await getDriveClient()).permissions
    .delete({
      supportsAllDrives: true,
      fileId,
      permissionId,
    })
    .then((response) => response.data);

export const updatePermission = async (
  fileId: string,
  permissionId: string,
  role: string,
  expirationTime: DateTime
) =>
  (await getDriveClient()).permissions
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
