/*
 * sri sri guru gauranga jayatah
 */
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { URL } from 'url';
import { Allotment, AllotmentStatus } from '../classes/Allotment';
import { AudioFileAnnotation } from '../classes/AudioFileAnnotation';
import { DateTimeConverter } from '../classes/DateTimeConverter';
import { RowUpdateMode, Spreadsheet } from '../classes/GoogleSheets';
import { SQRSubmission } from '../classes/SQRSubmission';
import uuidv4 = require('uuid/v4');
import _ = require('lodash');

class SQR {
  static baseRef = admin.database().ref(`/SQR`);
  static allotmentsRef = SQR.baseRef.child(`allotments`);
  static submissionsRef = SQR.baseRef.child(`submissions`);
  static draftSubmissionsRef = SQR.submissionsRef.child(`drafts`);
  static completedSubmissionsRef = SQR.submissionsRef.child(
    `completed`
  );
  static finalSubmissionsRef = SQR.submissionsRef.child(`final`);

  static createSubmissionLink(fileName: string, token: string): string {
    return new URL(
      `form/sound-quality-report/${encodeURIComponent(
        fileName
      )}/${encodeURIComponent(token)}`,
      `https://app.${functions.config().project.domain}`
    ).toString();
  }

  static createListenLink(fileName: string): string {
    const url = new URL(
      `listen/${encodeURIComponent(fileName)}`,
      functions.config().website.old.base_url
    );
    url.searchParams.set('seva', 'sqr');
    return url.toString();
  }

  static createAllotmentLink(emailAddress: string): string {
    const url = new URL(
      `https://app.${functions.config().project.domain}/sqr/allot`
    );
    url.searchParams.set('emailAddress', emailAddress);
    return url.toString();
  }

  static createSelfTrackingLink(emailAddress: string): string {
    const url = new URL(
      'https://hook.integromat.com/swlpnplbb3dilsmdxyc7vixjvenvh65a'
    );
    url.searchParams.set('email_address', emailAddress);
    return url.toString();
  }

  static async getUserAllotments(emailAddress: string) {
    return (
      _(
        (await this.allotmentsRef
          .orderByChild('assignee/emailAddress')
          .equalTo(emailAddress)
          .once('value')).val()
      )
        .toPairs()
        // Considering only ones with Given Timestamp, as after cancelation the assignee can be kept.
        .filter(([, value]) => Number.isInteger(value.timestampGiven))
        .map(item => new Allotment(...item))
        .value()
    );
  }

  static async spreadsheet() {
    return await Spreadsheet.open(functions.config().sqr.spreadsheet_id);
  }

  static async allotmentsSheet() {
    const spreadsheet = await this.spreadsheet();
    return await spreadsheet.useSheet('Allotments');
  }

  static async submissionsSheet() {
    const spreadsheet = await this.spreadsheet();
    return await spreadsheet.useSheet('Submissions');
  }

  /**
   * Imports allotment statuses from the spreadsheet.
   * Coordinator is marking allotments as Done manually in the spreadsheet, so preiodically importing them.
   * To be replaced with labeling emails in Gmail mailbox.
   */
  static async importStatusesFromSpreadsheet() {
    const sheet = await this.allotmentsSheet();

    const updates = [];
    (await sheet.getRows()).forEach(row => {
      const fileName = row['File Name'];

      if (fileName.match(/[\.\[\]$#]/g)) {
        console.warn(
          `File "${fileName}" has forbidden characters that can't be used as a node name.`
        );
        return;
      }

      updates.push([
        fileName,
        {
          status: row['Status'] || 'Spare',
          timestampDone: row['Date Done']
            ? DateTimeConverter.fromSerialDate(
                row['Date Done'],
                functions.config().coordinator.timezone
              ).toMillis()
            : null,
        },
      ]);
    });

    // Updating in batches due to the limitation
    // https://firebase.google.com/docs/database/usage/limits
    // Number of Cloud Functions triggered by a single write	1000
    const batches = _.chunk(updates, 500);

    await Promise.all(
      batches.map(batch => this.allotmentsRef.update(_.fromPairs(batch)))
    );
  }

  static async processAllotment(files, assignee, comment) {
    console.info(
      `Allotting ${files.map(file => file.name).join(', ')} to ${
        assignee.emailAddress
      }`
    );

    // Update the allotments in the database
    const updates = {};
    const tokens = new Map<string, string>();

    files.forEach(async file => {
      tokens.set(file.name, uuidv4());

      updates[`${file.name}/status`] = 'Given';
      updates[`${file.name}/timestampGiven`] =
        admin.database.ServerValue.TIMESTAMP;
      updates[`${file.name}/assignee`] = _.pick(
        assignee,
        'emailAddress',
        'name'
      );
      updates[`${file.name}/token`] = tokens.get(file.name);
    });
    await this.allotmentsRef.update(updates);
    /// Send the allotment email
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-allotment',
        to: assignee.emailAddress,
        bcc: functions.config().coordinator.email_address,
        replyTo: functions.config().coordinator.email_address,
        params: {
          files: files.map(file => ({
            name: file.name,
            links: {
              listen: SQR.createListenLink(file.name),
              submission: SQR.createSubmissionLink(
                file.name,
                tokens.get(file.name)
              ),
            },
          })),
          assignee,
          comment,
          date: DateTime.local().toFormat('dd.MM'),
          repeated:
            (await this.getUserAllotments(assignee.emailAddress)).length >
            files.length,
          links: {
            selfTracking: SQR.createSelfTrackingLink(
              assignee.emailAddress
            ),
          },
        },
      });
  }

  static async processSubmission(
    fileName: string,
    token: string,
    submission: SQRSubmission,
    updated: boolean = false
  ) {
    console.info(`Processing ${fileName}/${token} submission.`);

    const allotmentSnapshot = await this.allotmentsRef
      .child(fileName)
      .once('value');

    if (!allotmentSnapshot.exists())
      throw new Error(`File ${fileName} is not allotted in the database.`);

    const allotment = new Allotment(fileName, allotmentSnapshot.val());

    if (token !== allotment.token)
      throw new Error(`Token ${token} is invalid for ${fileName}.`);

    // Updating allotment status.
    // Sometimes submission is updated after it is marked as Done.
    // In this case we don’t change the status back to WIP.
    if (allotment.status === AllotmentStatus.Given)
      await allotmentSnapshot.ref.update({
        status: AllotmentStatus.WIP,
      });

    // Saving the submission to the spreadsheet
    await (await this.allotmentsSheet()).updateOrAppendRow(
      'Audio File Name',
      fileName,
      {
        Completed: DateTimeConverter.toSerialDate(submission.completed),
        Updated: DateTimeConverter.toSerialDate(submission.changed),
        'Update Link': SQR.createSubmissionLink(fileName, token),
        'Audio File Name': fileName,
        'Unwanted Parts': submission.unwantedParts.format(),
        'Sound Issues': submission.soundIssues.format(),
        'Sound Quality Rating': submission.soundQualityRating,
        Beginning: submission.duration ? submission.duration.beginning : null,
        Ending: submission.duration ? submission.duration.ending : null,
        Comments: submission.comments,
        Name: allotment.assignee.name,
        'Email Address': allotment.assignee.emailAddress,
      }
    );

    // Sending email notification for the coordinator

    const userAllotments = await this.getUserAllotments(
      allotment.assignee.emailAddress
    );

    const currentSet = userAllotments.filter(item => item.isActive);

    const warnings = [];
    if (updated) warnings.push('This is an updated submission!');

    if (!allotment.isActive)
      warnings.push(`Status of the allotment is ${allotment.status}`);

    if (_(userAllotments).every(item => item.status !== AllotmentStatus.Given))
      warnings.push("It's time to allot!");

    if (_(userAllotments).every(item => item.status !== AllotmentStatus.Done))
      warnings.push('This is the first submission by this devotee!');

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-submission',
        replyTo: allotment.assignee.emailAddress,
        to: functions.config().coordinator.email_address,
        params: {
          currentSet,
          submission: {
            fileName,
            author: allotment.assignee,
            ...submission,
          },
          warnings,
          allotmentLink: SQR.createAllotmentLink(
            allotment.assignee.emailAddress
          ),
          updateLink: SQR.createSubmissionLink(fileName, token),
        },
      });

    // Saving submission to the cold storage
    await admin
      .database()
      .ref(`/SQR/submissions/final/${fileName}`)
      .set(submission);
  }

  static async importSubmissions() {
    const sheet = await this.submissionsSheet();
    const updates = {};
    (await sheet.getRows()).forEach(row => {
      const fileName = row['Audio File Name'];
      const token = /.*token=([\w-]+)/.exec(row['Update Link'])[1];

      updates[`${fileName}`] = {
        completed: DateTimeConverter.fromSerialDate(
          row['Completed'],
          functions.config().coordinator.timezone
        ).toMillis(),
        created: DateTimeConverter.fromSerialDate(
          row['Completed'],
          functions.config().coordinator.timezone
        ).toMillis(),
        changed: DateTimeConverter.fromSerialDate(
          row['Updated'],
          functions.config().coordinator.timezone
        ).toMillis(),
        comments: row['Comments'],
        soundIssues: AudioFileAnnotation.parse(row['Sound Issues']),
        soundQualityRating: row['Sound Quality Rating'],
        unwantedParts: AudioFileAnnotation.parse(row['Unwanted Parts']),
        duration: {
          //TODO: sanitze duration
          beginning: row['Beginning'],
          ending: row['Ending'],
        },
        author: {
          emailAddress: row['Email Address'],
          name: row['Name'],
        },
        token,
        imported: true,
      };
    });
    await this.finalSubmissionsRef.update(updates);
  }

  static async importAllotments() {
    const sheet = await this.allotmentsSheet();
    const updates = [];
    (await sheet.getRows()).forEach(row => {
      const fileName = row['File Name'];

      if (fileName.match(/[\.\[\]$#]/g)) {
        console.warn(
          `File "${fileName}" has forbidden characters that can't be used as a node name.`
        );
        return;
      }

      updates.push([
        fileName,
        {
          status: row['Status'] || 'Spare',
          timestampGiven: row['Date Given']
            ? DateTimeConverter.fromSerialDate(
                row['Date Given'],
                functions.config().coordinator.timezone
              ).toMillis()
            : null,
          timestampDone: row['Date Done']
            ? DateTimeConverter.fromSerialDate(
                row['Date Done'],
                functions.config().coordinator.timezone
              ).toMillis()
            : null,
          assignee: {
            emailAddress: row['Email'],
            name: row['Devotee'],
          },
          notes: row['Notes'],
        },
      ]);
    });

    const batches = _.chunk(updates, 500);

    await Promise.all(
      batches.map(batch => this.allotmentsRef.update(_.fromPairs(batch)))
    );
  }

  static async exportAllotment(allotment: Allotment) {
    const sheet = await this.allotmentsSheet();

    const rowNumber = await sheet.findRowNumber(
      'File Name',
      allotment.fileName
    );
    if (!rowNumber)
      throw new Error(
        `File ${allotment.fileName} is not found in the SQR allotments sheet.`
      );

    await sheet.updateRow(
      rowNumber,
      {
        'Date Given': allotment.timestampGiven
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(allotment.timestampGiven)
            )
          : null,
        Notes: allotment.notes,
        Status: allotment.status.replace('Spare', ''),
        Devotee: allotment.assignee ? allotment.assignee.name : null,
        Email: allotment.assignee ? allotment.assignee.emailAddress : null,
        'Date Done': allotment.timestampDone
          ? DateTimeConverter.toSerialDate(
              DateTime.fromMillis(allotment.timestampDone)
            )
          : null,
      },
      RowUpdateMode.Partial
    );
  }

  static async getLists() {
    const sheet = await this.allotmentsSheet();

    const rows = await sheet.getRows();

    return rows
      .filter(item => !item['Status'] && item['List'])
      .map(item => item['List'])
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  static async getSpareFiles(
    list: string,
    languages: string[],
    language: string,
    count: number
  ) {
    const sheet = await this.allotmentsSheet();
    return (await sheet.getRows())
      .filter(
        item =>
          !item['Status'] &&
          item['List'] === list &&
          (languages || [language]).includes(item['Language'] || 'None')
      )
      .map(item => ({
        name: item['File Name'],
        list: item['List'],
        serial: item['Serial'],
        notes:
          item['Notes'] + item['Devotee']
            ? ` Devotee column is not empty: ${item['Devotee']}`
            : '',
        language: item['Language'],
        date: item['Serial'],
      }))
      .slice(0, count || 20);
  }

  static async cancelAllotment(
    fileName: string,
    token: string,
    comments: string,
    reason: string
  ) {
    const snapshot = await this.allotmentsRef.child(fileName).once('value');

    if (!snapshot.exists())
      throw new functions.https.HttpsError(
        'invalid-argument',
        `File ${fileName} not found in the database.`
      );

    const allotment = snapshot.val();

    if (allotment.token !== token)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid token.'
      );

    if (allotment.status === 'Done')
      throw new functions.https.HttpsError(
        'failed-precondition',
        'File is already marked as Done, cannot cancel allotment.'
      );

    await snapshot.ref.update({
      notes: [allotment.notes, comments].filter(Boolean).join('\n'),
      status: reason === 'unable to play' ? 'Audio Problem' : 'Spare',
      timestampGiven: null,
      token: null,
    });

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-cancellation',
        replyTo: allotment.assignee.emailAddress,
        to: functions.config().coordinator.email_address,
        params: {
          fileName,
          comments,
          reason,
          assignee: allotment.assignee,
          allotmentLink: this.createAllotmentLink(
            allotment.assignee.emailAddress
          ),
          currentSet: (await this.getUserAllotments(
            allotment.assignee.emailAddress
          )).filter(item => item.isActive),
        },
      });
  }
}

/**
 * SQR allotment processing
 */
export const processAllotment = functions.https.onCall(
  async ({ assignee, files, comment }, context) => {
    if (
      !context.auth ||
      !context.auth.token ||
      !context.auth.token.coordinator
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    if (!assignee || !files || files.length === 0)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Devotee and Files are required.'
      );

    await SQR.processAllotment(files, assignee, comment);
  }
);

/**
 * SQR new submission processing
 */
export const processSubmission = functions.database
  .ref('/SQR/submissions/completed/{fileName}/{token}')
  .onWrite(async (change, { params: { fileName, token } }) => {
    // Ignoring deletions
    if (!change.after.exists()) return;

    await SQR.processSubmission(
      fileName,
      token,
      new SQRSubmission(change.after.val()),
      change.before.exists()
    );
  });

export const importSpreadSheetData = functions.https.onCall(
  async (_data, context) => {
    if (
      !functions.config().emulator &&
      (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    await Promise.all([
      SQR.importSubmissions(),
      SQR.importAllotments(),
    ]);
  }
);

/**
 * On creation of a new allotment record id, update and sync data values to Google Spreadsheets
 *
 */
export const exportAllotmentToSpreadsheet = functions.database
  .ref('/SQR/allotments/{fileName}')
  .onWrite(async (change, { params: { fileName } }) => {
    // Ignore deletions
    if (!change.after.exists()) {
      console.info(`Ignoring deletion of ${fileName}.`);
      return;
    }

    console.info(fileName, change.before.val(), change.after.val());

    await SQR.exportAllotment(
      new Allotment(fileName, change.after.val())
    );
  });

/**
 * Gets lists with spare files
 */
export const getLists = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || !context.auth.token.coordinator)
    throw new functions.https.HttpsError(
      'permission-denied',
      'The function must be called by an authenticated coordinator.'
    );
  return await SQR.getLists();
});

/**
 * Gets spare files for specified list and languages
 */
export const getSpareFiles = functions.https.onCall(
  async ({ list, language, languages, count }, context) => {
    if (!context.auth || !context.auth.token || !context.auth.token.coordinator)
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );

    return await SQR.getSpareFiles(list, languages, language, count);
  }
);

export const cancelAllotment = functions.https.onCall(
  async ({ fileName, comments, token, reason }) => {
    console.info(`${fileName}/${token}, ${reason}, ${comments}`);

    await SQR.cancelAllotment(fileName, token, comments, reason);
  }
);

export const migrateSubmissions = functions.pubsub
  .topic('database-migration')
  .onPublish(async () => {
    if ((await SQR.submissionsRef.once('value')).exists()) {
      console.warn('New path is not empty, aborting migration.');
      return;
    }

    const existing = (await admin
      .database()
      .ref('/submissions/SQR')
      .once('value')).val();

    await Promise.all([
      // Drafts
      SQR.draftSubmissionsRef.set(
        _.mapValues(existing, submissions =>
          _.omitBy(submissions, submission => submission.completed)
        )
      ),
      //Finals
      SQR.finalSubmissionsRef.set(
        _.mapValues(existing, submissions =>
          _(submissions)
            .sortBy(submission => submission.completed)
            .findLast(submission => submission.completed)
        )
      ),
    ]);
  });

export const migrateAllotments = functions.pubsub
  .topic('database-migration')
  .onPublish(async () => {
    if ((await SQR.allotmentsRef.once('value')).exists()) {
      console.warn('New path is not empty, aborting migration.');
      return;
    }

    const existing = (await admin
      .database()
      .ref('/allotments/SQR')
      .once('value')).val();

    await SQR.allotmentsRef.set(existing);
  });

export const importStatuses = functions.pubsub
  .schedule('every 1 hours')
  .timeZone(functions.config().coordinator.timezone)
  .onRun(async () => {
    await SQR.importStatusesFromSpreadsheet();
  });
