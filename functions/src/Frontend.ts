/*!
 * sri sri guru gauranga jayatah
 */

import { URL } from 'url';
import { projectDomain } from './params';

export function getFrontendUrl(): URL {
  return new URL(`https://app.${projectDomain.value()}`);
}

export const listeningPageLink = (fileName: string) =>
  new URL(
    `listen/${encodeURIComponent(fileName)}.mp3`,
    getFrontendUrl()
  ).toString();

export const sqrSubmissionLink = (fileName: string, token: string) =>
  new URL(
    `form/sound-quality-report/${encodeURIComponent(
      fileName
    )}/${encodeURIComponent(token)}`,
    getFrontendUrl()
  ).toString();

export const sqrAllotmentLink = (emailAddress: string) => {
  const url = new URL('/sqr/allot', getFrontendUrl());
  url.searchParams.set('emailAddress', emailAddress);
  return url.toString();
};

export const sqrSelfTrackingLink = (emailAddress: string) => {
  const url = new URL(
    'https://hook.integromat.com/swlpnplbb3dilsmdxyc7vixjvenvh65a'
  );
  url.searchParams.set('email_address', emailAddress);
  return url.toString();
};

export const trackEditingVersionOutputLink = (
  taskId: string,
  versionId: string
) =>
  new URL(
    `te/tasks/${encodeURIComponent(taskId)}/versions/${encodeURIComponent(
      versionId
    )}/file`,
    getFrontendUrl()
  ).toString();
