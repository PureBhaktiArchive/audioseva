/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { AllotmentStatus, isActiveAllotment } from '../Allotment';
import { formatAudioAnnotations } from '../AudioAnnotation';
import { DateTimeConverter } from '../DateTimeConverter';
import {
  listeningPageLink,
  sqrAllotmentLink,
  sqrSelfTrackingLink,
  sqrSubmissionLink,
} from '../Frontend';
import { Person } from '../Person';
import { Spreadsheet } from '../Spreadsheet';
import { SQRSubmission } from './SQRSubmission';
import { TasksRepository } from './TasksRepository';
import _ = require('lodash');

export class SQRWorkflow {
  static baseRef = admin.database().ref(`/SQR`);
  static allotmentsRef = SQRWorkflow.baseRef.child(`allotments`);
  static submissionsRef = SQRWorkflow.baseRef.child(`submissions`);
  static draftSubmissionsRef = SQRWorkflow.submissionsRef.child(`drafts`);
  static completedSubmissionsRef =
    SQRWorkflow.submissionsRef.child(`completed`);
  static finalSubmissionsRef = SQRWorkflow.submissionsRef.child(`final`);

  static async submissionsSheet() {
    return await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id as string,
      'Submissions'
    );
  }

  static async getSpareFiles(list: string, languages: string[], count: number) {
    const repository = new TasksRepository();
    const files = await repository.getSpareFiles(list, languages, count);

    /**
     * When the coordinator clears the status in the database
     * these files will be spared in the database during allotment
     */
    console.info(`Making spare`, files);
    await repository.saveToDatabase(
      files.map(({ name: fileName }) => ({
        fileName,
        status: AllotmentStatus.Spare,
        token: null,
        timestampGiven: null,
      }))
    );

    return files;
  }

  static async processAllotment(
    fileNames: string[],
    assignee: Person,
    comment: string
  ) {
    console.info(
      `Allotting ${fileNames.join(', ')} to ${assignee.emailAddress}`
    );

    const repository = new TasksRepository();
    const tasks = await repository.getTasks(fileNames);

    const dirtyTasks = _(tasks)
      .filter()
      .filter(
        ({ status, token, timestampGiven }) =>
          !!token || !!timestampGiven || status !== AllotmentStatus.Spare
      )
      .map(({ fileName }) => fileName)
      .join();

    if (dirtyTasks.length)
      throw new functions.https.HttpsError(
        'aborted',
        `Files ${dirtyTasks} seem to be already allotted in the database. Please 🔨 the administrator.`
      );

    const updatedTasks = await repository.save(
      ...fileNames.map((fileName) => ({
        fileName,
        status: AllotmentStatus.Given,
        timestampGiven: admin.database.ServerValue.TIMESTAMP as number,
        assignee,
        token: uuidv4(),
      }))
    );

    /// Send the allotment email
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        timestamp: admin.database.ServerValue.TIMESTAMP,
        template: 'sqr/allotment',
        to: assignee.emailAddress,
        bcc: functions.config().coordinator.email_address,
        replyTo: functions.config().coordinator.email_address,
        params: {
          files: updatedTasks.map(({ fileName, token }) => ({
            name: fileName,
            links: {
              listen: listeningPageLink(fileName),
              submission: sqrSubmissionLink(fileName, token),
            },
          })),
          assignee,
          comment,
          repeated:
            (await repository.getUserAllotments(assignee.emailAddress)).length >
            fileNames.length,
          links: {
            selfTracking: sqrSelfTrackingLink(assignee.emailAddress),
          },
        },
      });
  }

  static async processSubmission(
    fileName: string,
    token: string,
    submission: SQRSubmission,
    updated = false
  ) {
    console.info(`Processing ${fileName}/${token} submission:`, submission);

    const repository = new TasksRepository();
    const task = await repository.getTask(fileName);

    if (token !== task.token) {
      console.error(`Token ${token} is invalid for ${fileName}. Aborting.`);
      return;
    }

    // Saving the author into submission
    submission.author = task.assignee;

    // Important: get this before saving current submission to final
    const previousSubmissions = await this.finalSubmissionsRef
      .orderByChild('author/emailAddress')
      .equalTo(submission.author.emailAddress)
      .once('value');

    // Saving submission to the cold storage
    await this.finalSubmissionsRef.child(fileName).set(submission);

    // Updating the task status.
    // Sometimes submission is updated after it is marked as Done.
    // In this case we don’t change the status back to WIP.
    if (task.status !== AllotmentStatus.Done)
      await repository.save({
        fileName,
        status: AllotmentStatus.WIP,
      });

    // Saving the submission to the spreadsheet
    await (
      await this.submissionsSheet()
    ).updateOrAppendRows('Audio File Name', [
      {
        Completed: DateTimeConverter.toSerialDate(
          DateTime.fromMillis(submission.completed)
        ),
        Updated: DateTimeConverter.toSerialDate(
          DateTime.fromMillis(submission.changed)
        ),
        'Update Link': sqrSubmissionLink(fileName, token),
        'Audio File Name': fileName,
        'Unwanted Parts': submission.unwantedParts
          ? formatAudioAnnotations(...submission.unwantedParts)
          : null,
        'Sound Issues': submission.soundIssues
          ? formatAudioAnnotations(...submission.soundIssues)
          : null,
        'Sound Quality Rating': submission.soundQualityRating,
        Comments: submission.comments,
        Name: submission.author.name,
        'Email Address': submission.author.emailAddress,
      },
    ]);

    // Sending email notification for the coordinator

    const currentSet = await repository.getCurrentSet(
      task.assignee.emailAddress
    );

    const warnings = [];
    if (updated) warnings.push('This is an updated submission!');

    if (!isActiveAllotment(task))
      warnings.push(`Status of the allotment is ${task.status}`);

    if (_(currentSet).every((item) => item.status !== AllotmentStatus.Given))
      warnings.push("It's time to allot!");

    if (!previousSubmissions.exists())
      warnings.push('This is the first submission by this devotee!');

    console.log('Current Set:', currentSet);
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        timestamp: admin.database.ServerValue.TIMESTAMP,
        template: 'sqr/submission',
        to: functions.config().coordinator.email_address,
        replyTo: task.assignee.emailAddress,
        params: {
          currentSet,
          submission: {
            fileName,
            author: task.assignee,
            ...submission,
          },
          warnings,
          allotmentLink: sqrAllotmentLink(task.assignee.emailAddress),
          updateLink: sqrSubmissionLink(fileName, token),
        },
      });
  }

  static async cancelAllotment(
    fileName: string,
    token: string,
    comments: string,
    reason: string
  ) {
    console.info(
      `Cancelling ${fileName}/${token} allotment: ${reason}, ${comments}.`
    );

    const repository = new TasksRepository();
    const task = await repository.getTask(fileName);

    if (task.token !== token)
      throw new functions.https.HttpsError(
        'permission-denied',
        `Invalid token ${token} for file ${fileName}.`
      );

    if (task.status === AllotmentStatus.Done)
      throw new functions.https.HttpsError(
        'failed-precondition',
        `File ${fileName} is already marked as Done, cannot cancel.`
      );

    await repository.save({
      fileName,
      notes: [task.notes, comments].filter(Boolean).join('\n'),
      status:
        reason === 'unable to play'
          ? AllotmentStatus.AudioProblem
          : AllotmentStatus.Spare,
      timestampGiven: null,
      token: null,
      assignee: null,
    });

    const currentSet = await repository.getCurrentSet(
      task.assignee.emailAddress
    );

    const warnings = [];
    if (_(currentSet).every((item) => item.status !== AllotmentStatus.Given))
      warnings.push("It's time to allot!");

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        timestamp: admin.database.ServerValue.TIMESTAMP,
        template: 'sqr/cancellation',
        to: functions.config().coordinator.email_address,
        replyTo: task.assignee.emailAddress,
        params: {
          fileName,
          comments,
          reason,
          assignee: task.assignee,
          allotmentLink: sqrAllotmentLink(task.assignee.emailAddress),
          currentSet,
          warnings,
        },
      });
  }
}
