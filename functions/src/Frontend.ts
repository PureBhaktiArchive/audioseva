/*!
 * sri sri guru gauranga jayatah
 */

import * as functions from 'firebase-functions';
import { URL } from 'url';

export const frontendUrl = new URL(
  `https://app.${functions.config().project.domain as string}`
);

export const listeningPageLink = (fileName: string) =>
  new URL(`listen/${encodeURIComponent(fileName)}.mp3`, frontendUrl).toString();

export const sqrSubmissionLink = (fileName: string, token: string) =>
  new URL(
    `form/sound-quality-report/${encodeURIComponent(
      fileName
    )}/${encodeURIComponent(token)}`,
    frontendUrl
  ).toString();

export const sqrAllotmentLink = (emailAddress: string) => {
  const url = new URL('/sqr/allot', frontendUrl);
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
    frontendUrl
  ).toString();
