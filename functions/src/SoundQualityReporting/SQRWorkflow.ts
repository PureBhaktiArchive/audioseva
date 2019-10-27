/*!
 * sri sri guru gauranga jayatah
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { URL } from 'url';
import { AllotmentStatus } from '../Allotment';
import { Assignee } from '../Assignee';
import { formatAudioAnnotations } from '../AudioAnnotation';
import { abortCall } from '../auth';
import { DateTimeConverter } from '../DateTimeConverter';
import { Spreadsheet } from '../Spreadsheet';
import { SQRSubmission } from './SQRSubmission';
import { TasksRepository } from './TasksRepository';
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

  static async allotmentsSheet() {
    return await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id,
      'Allotments'
    );
  }

  static async submissionsSheet() {
    return await Spreadsheet.open(
      functions.config().sqr.spreadsheet_id,
      'Submissions'
    );
  }

  static async processAllotment(
    fileNames: string[],
    assignee: Assignee,
    comment: string
  ) {
    console.info(
      `Allotting ${fileNames.join(', ')} to ${assignee.emailAddress}`
    );

    const repository = await TasksRepository.open();
    const tasks = await repository.getTasks(fileNames);

    const dirtyTasks = _(tasks)
      .filter()
      .filter(
        ({ status, token, assignee: currentAssignee, timestampGiven }) =>
          !!token ||
          !!currentAssignee ||
          !!timestampGiven ||
          status !== AllotmentStatus.Spare
      )
      .map(({ fileName }) => fileName)
      .join();

    if (dirtyTasks.length)
      abortCall(
        'aborted',
        `Files ${dirtyTasks} seem to be already allotted in the database. Please 🔨 the administrator.`
      );

    const updatedTasks = await repository.save(
      ...fileNames.map(fileName => ({
        fileName,
        status: AllotmentStatus.Given,
        timestampGiven: admin.database.ServerValue.TIMESTAMP,
        assignee,
        token: uuidv4(),
      }))
    );

    /// Send the allotment email
    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-allotment',
        to: assignee.emailAddress,
        params: {
          files: updatedTasks.map(({ fileName, token }) => ({
            name: fileName,
            links: {
              listen: SQRWorkflow.createListenLink(fileName),
              submission: SQRWorkflow.createSubmissionLink(fileName, token),
            },
          })),
          assignee,
          comment,
          repeated:
            (await repository.getUserAllotments(assignee.emailAddress)).length >
            fileNames.length,
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
    console.info(`Processing ${fileName}/${token} submission:`, submission);

    const repository = await TasksRepository.open();
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
    await (await this.submissionsSheet()).updateOrAppendRows(
      'Audio File Name',
      [
        {
          Completed: DateTimeConverter.toSerialDate(
            DateTime.fromMillis(submission.completed)
          ),
          Updated: DateTimeConverter.toSerialDate(
            DateTime.fromMillis(submission.changed)
          ),
          'Update Link': this.createSubmissionLink(fileName, token),
          'Audio File Name': fileName,
          'Unwanted Parts': submission.unwantedParts
            ? formatAudioAnnotations(...submission.unwantedParts)
            : null,
          'Sound Issues': submission.soundIssues
            ? formatAudioAnnotations(...submission.soundIssues)
            : null,
          'Sound Quality Rating': submission.soundQualityRating,
          Beginning: submission.duration ? submission.duration.beginning : null,
          Ending: submission.duration ? submission.duration.ending : null,
          Comments: submission.comments,
          Name: submission.author.name,
          'Email Address': submission.author.emailAddress,
        },
      ]
    );

    // Sending email notification for the coordinator

    const userAllotments = await repository.getUserAllotments(
      task.assignee.emailAddress
    );

    const currentSet = userAllotments.filter(item => item.isActive);

    const warnings = [];
    if (updated) warnings.push('This is an updated submission!');

    if (!task.isActive)
      warnings.push(`Status of the allotment is ${task.status}`);

    if (_(userAllotments).every(item => item.status !== AllotmentStatus.Given))
      warnings.push("It's time to allot!");

    if (!previousSubmissions.exists())
      warnings.push('This is the first submission by this devotee!');

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-submission',
        replyTo: task.assignee.emailAddress,
        params: {
          currentSet,
          submission: {
            fileName,
            author: task.assignee,
            ...submission,
          },
          warnings,
          allotmentLink: SQRWorkflow.createAllotmentLink(
            task.assignee.emailAddress
          ),
          updateLink: SQRWorkflow.createSubmissionLink(fileName, token),
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

    const repository = await TasksRepository.open();
    const task = await repository.getTask(fileName);

    if (task.token !== token)
      abortCall(
        'permission-denied',
        `Invalid token ${token} for file ${fileName}.`
      );

    if (task.status === AllotmentStatus.Done)
      abortCall(
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

    await admin
      .database()
      .ref(`/email/notifications`)
      .push({
        template: 'sqr-cancellation',
        replyTo: task.assignee.emailAddress,
        to: functions.config().coordinator.email_address,
        params: {
          fileName,
          comments,
          reason,
          assignee: task.assignee,
          allotmentLink: this.createAllotmentLink(task.assignee.emailAddress),
          currentSet: (await repository.getUserAllotments(
            task.assignee.emailAddress
          )).filter(item => item.isActive),
        },
      });
  }
}
