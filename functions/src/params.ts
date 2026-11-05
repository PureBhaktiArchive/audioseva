/*! sri sri guru gauranga jayatah */
import { defineSecret, defineString } from 'firebase-functions/params';

export const coordinatorTimezone = defineString('COORDINATOR_TIMEZONE');
export const coordinatorEmailAddress = defineString(
  'COORDINATOR_EMAIL_ADDRESS'
);
export const trackEditingSpreadsheetId = defineString(
  'TRACK_EDITING_SPREADSHEET_ID'
);
export const trackEditingCoordinatorEmailAddress = defineString(
  'TRACK_EDITING_COORDINATOR_EMAIL_ADDRESS'
);
export const soundQualityReportingSpreadsheetId = defineString(
  'SOUND_QUALITY_REPORTING_SPREADSHEET_ID'
);
export const transcriptionSpreadsheetId = defineString(
  'TRANSCRIPTION_SPREADSHEET_ID'
);
export const transcriptionFolderId = defineString('TRANSCRIPTION_FOLDER_ID');
export const transcriptionCoordinatorEmailAddress = defineString(
  'TRANSCRIPTION_COORDINATOR_EMAIL_ADDRESS'
);
export const emailSenderName = defineString('EMAIL_SENDER_NAME');
export const emailSenderAddress = defineString('EMAIL_SENDER_ADDRESS');
export const projectDomain = defineString('PROJECT_DOMAIN');
export const registrationsSpreadsheetId = defineString(
  'REGISTRATIONS_SPREADSHEET_ID'
);
export const donationsCashSpreadsheetId = defineString(
  'DONATIONS_CASH_SPREADSHEET_ID'
);
export const donationsCashSpreadsheetName = defineString(
  'DONATIONS_CASH_SPREADSHEET_NAME'
);
export const donationsContactEmailAddress = defineString(
  'DONATIONS_CONTACT_EMAIL_ADDRESS'
);
export const finalPublicationBucket = defineString('FINAL_PUBLICATION_BUCKET');
export const finalPublicationInvokers = defineString(
  'FINAL_PUBLICATION_INVOKERS'
);
export const fidelityCheckSpreadsheetId = defineString(
  'FIDELITY_CHECK_SPREADSHEET_ID'
);
export const directusUrl = defineString('DIRECTUS_URL');

export const emailConnection = defineSecret('EMAIL_CONNECTION');
export const directusToken = defineSecret('DIRECTUS_TOKEN');
