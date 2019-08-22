/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { URL } from 'url';
import { Allotment, AllotmentStatus } from '../Allotment';
import { AudioAnnotationArray } from '../AudioAnnotation';
import { DateTimeConverter } from '../DateTimeConverter';
import { RowUpdateMode, Spreadsheet } from '../GoogleSheets';
import { SQRSubmission } from './SQRSubmission';
import uuidv4 = require('uuid/v4');
import _ = require('lodash');

export class SQRWorkflow {
  static baseRef = admin.database().ref(`/SQR`);
  static allotmentsRef = SQRWorkflow.baseRef.child(`allotments`);
  static submissionsRef = SQRWorkflow.baseRef.child(`submissions`);
  static draftSubmissionsRef = SQRWorkflow.submissionsRef.child(`drafts`);
  static completedSubmissionsRef = SQRWorkflow.submissionsRef.child(
    `completed`
  );
  static finalSubmissionsRef = SQRWorkflow.submissionsRef.child(`final`);

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
  static async importStatuses() {
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
        soundIssues: AudioAnnotationArray.parse(row['Sound Issues']),
        soundQualityRating: row['Sound Quality Rating'],
        unwantedParts: AudioAnnotationArray.parse(row['Unwanted Parts']),
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
              listen: SQRWorkflow.createListenLink(file.name),
              submission: SQRWorkflow.createSubmissionLink(
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
            selfTracking: SQRWorkflow.createSelfTrackingLink(
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
        'Update Link': SQRWorkflow.createSubmissionLink(fileName, token),
        'Audio File Name': fileName,
        'Unwanted Parts': submission.unwantedParts.toString(),
        'Sound Issues': submission.soundIssues.toString(),
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
          allotmentLink: SQRWorkflow.createAllotmentLink(
            allotment.assignee.emailAddress
          ),
          updateLink: SQRWorkflow.createSubmissionLink(fileName, token),
        },
      });

    // Saving submission to the cold storage
    await admin
      .database()
      .ref(`/SQR/submissions/final/${fileName}`)
      .set(submission);
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
