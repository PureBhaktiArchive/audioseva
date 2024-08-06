/*
 * sri sri guru gauranga jayatah
 */
import { PubSub } from '@google-cloud/pubsub';
import { ServerValue, getDatabase } from 'firebase-admin/database';
import * as functions from 'firebase-functions';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import * as mir from 'multi-integer-range';
import { DateTimeConverter, secondsInDay } from '../DateTimeConverter';
import { Person } from '../Person';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';
import { authorize } from '../auth';
import { getDomainWideDelegationClient } from '../domain-wide-delegation';
import {
  MimeTypes,
  Queries,
  createDriveFile,
  createPermission,
  deletePermission,
  listDriveFiles,
  listPermissions,
} from '../drive';
import { unwrapGaxiosResponse } from '../gaxios-commons';

type FileRow = {
  ID: number;
  Title: string;
  Language: string;
  Duration: number;
  'Audio Link': string;
  'Split into Parts': boolean;
  Notes: string;
  'Duration of Parts': number;
  'Parts Total': number;
  'Parts Completed': number;
  'Latest Stage': string;
  'Latest Status': Status;
  'Latest Devotee': string;
  Completed: Completed;
};

type PartRow = {
  ID: number;
  Part: number;
  Duration: number;
  Language: string;
  Notes: string;
  'Latest Stage': string;
  'Latest Status': Status;
  'Latest Devotee': string;
  Completed: Completed;
};

enum Status {
  Given = 'Given',
  Done = 'Done',
}

enum Completed {
  Yes = 'COMPLETED',
}

type PartItem = {
  number: number;
  duration: number; // in seconds
  latestStage: string;
  latestStatus: Status;
  latestAssignee: string;
  completed: boolean;
};

type FileItem = {
  id: number;
  title: string;
  notes: string;
  languages: string[];
  latestStage: string;
  latestStatus: Status;
  latestAssignee: string;
  duration: number; // in seconds
  parts: PartItem[];
};

export const getFiles = functions.https.onCall(async (data, context) => {
  authorize(context, ['TR.coordinator']);

  const [filesSheet, partsSheet] = await Promise.all([
    Spreadsheet.open<FileRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Overview'
    ),
    Spreadsheet.open<PartRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Parts'
    ),
  ]);

  const [fileRows, partRows] = await Promise.all([
    filesSheet.getRows(),
    partsSheet.getRows(),
  ]);

  // Can be replaced with Map.groupBy after upgrading to Node 21: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy#browser_compatibility
  // Implementation is inspired by https://stackoverflow.com/a/64489535/3082178
  const partsMap = partRows.reduce((result, row) => {
    const part: PartItem = {
      number: +row.Part,
      duration: +row.Duration * secondsInDay,
      latestStage: row['Latest Stage'],
      latestStatus: row['Latest Status'],
      latestAssignee: row['Latest Devotee'],
      completed: row.Completed?.toUpperCase() === Completed.Yes,
    };
    result.get(row.ID)?.push(part) ?? result.set(row.ID, [part]);
    return result;
  }, new Map<number, PartItem[]>());

  return fileRows.flatMap<FileItem>((row) =>
    // Filtering empty rows
    !row.ID ||
    // Filtering completed files out
    row.Completed?.toUpperCase() === Completed.Yes
      ? []
      : {
          id: row.ID,
          title: row.Title,
          notes: row.Notes,
          languages: row.Language?.split(',').map((value) => value.trim()),
          duration: row.Duration * secondsInDay,
          latestStage: row['Latest Stage'],
          latestStatus: row['Latest Status'],
          latestAssignee: row['Latest Devotee'],
          parts: partsMap.get(row.ID),
        }
  );
});

type AllotmentRow = {
  ID: number;
  'Part Num': number;
  'Translation Language'?: string;
  'Date Given': number;
  Status: Status;
  Stage: string;
  Last?: string;
  'Google Doc'?: string;
  'Last Modified'?: string;
  Devotee: string;
  Email: string;
  Comments?: string;
  Feedback?: string;
  'Reference file'?: string;
  'Date Done'?: number;
};

type Allotment = {
  assignee: Person;
  stage: string;
  language: string;
  id: number;
  parts: number[];
  message: string;
};

type StageDescription = {
  name: string;
  guidelines: string;
} & Record<string, { guidelines: string }>; // Specific guidelines for various languages

const fileNameForPart = (id: number, part: number) => `${id}.part-${part}`;

const getTranscriptionRef = () => getDatabase().ref('/transcription');

export const allot = functions.https.onCall(
  async (data: Allotment, context) => {
    authorize(context, ['TR.coordinator']);

    let [transcriptsFolder] = await listDriveFiles([
      Queries.mimeTypeIs(MimeTypes.Folder),
      Queries.parentIs(functions.config().transcription.folder.id),
      Queries.nameIs(data.id.toString()),
    ]);

    // Creating a folder if it does not exist yet
    transcriptsFolder ||= await createDriveFile(
      data.id.toString(),
      MimeTypes.Folder,
      functions.config().transcription.folder.id
    );

    const existingDocs = await listDriveFiles([
      Queries.mimeTypeIs(MimeTypes.Document),
      Queries.parentIs(transcriptsFolder.id),
    ]);

    const getGoogleDoc = (name: string) =>
      // First, trying to find an existing document
      existingDocs.find((file) => file.name === name) ||
      // Creating a new one if not found
      createDriveFile(name, MimeTypes.Document, transcriptsFolder.id);

    const allottedGoogleDocs = await Promise.all(
      data.parts.length
        ? data.parts.map((part) => getGoogleDoc(fileNameForPart(data.id, part)))
        : [getGoogleDoc(data.id.toString())]
    );

    // Granting permissions for the assignee to all the allotted docs
    await Promise.all(
      allottedGoogleDocs.map((file) =>
        createPermission(
          file.id,
          data.assignee.emailAddress,
          data.stage === 'TRSC' ? 'writer' : 'commenter'
        )
      )
    );

    const sheet = await Spreadsheet.open<AllotmentRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Allotments'
    );
    await sheet.appendRows(
      (data.parts.length
        ? data.parts
        : // Using null as a part number to add a row for the whole file
          [null]
      ).map((part, index) => ({
        ID: data.id,
        'Part Num': part,
        Stage: data.stage,
        Status: Status.Given,
        'Date Given': DateTimeConverter.toSerialDate(DateTime.now()),
        Devotee: data.assignee.name,
        Email: data.assignee.emailAddress,
        'Google Doc': allottedGoogleDocs[index].webViewLink,
      }))
    );

    // Don't send emails from the emulator
    if (process.env.FUNCTIONS_EMULATOR) return;

    const stageDescription = (
      await getTranscriptionRef().child(`stages/${data.stage}`).once('value')
    ).val() as StageDescription;

    /// Send an allotment email
    await getDatabase()
      .ref(`/email/notifications`)
      .push({
        timestamp: ServerValue.TIMESTAMP,
        template: 'transcription/allotment',
        to: data.assignee.emailAddress,
        bcc: functions.config().transcription.coordinator.email_address,
        replyTo: functions.config().transcription.coordinator.email_address,
        params: {
          ...data,
          parts: data.parts.map((part, index) => ({
            number: part,
            audioLink: `https://storage.googleapis.com/${StorageManager.getFullBucketName('parts')}/${data.id}/${data.id}.part-${part}.mp3`,
            docLink: allottedGoogleDocs[index].webViewLink,
          })),
          partsRanges: mir.stringify(mir.normalize(data.parts)),
          // These links are added only for the full file allotments
          ...(data.parts.length === 0 && {
            audioLink: `https://storage.googleapis.com/${functions.config().final?.publication?.bucket}/${data.id}.mp3`,
            docLink: allottedGoogleDocs?.[0]?.webViewLink,
          }),
          stageName: stageDescription?.name,
          guidelinesLink:
            stageDescription?.[data.language]?.guidelines ||
            stageDescription?.guidelines,
        },
      });
  }
);

const TOPIC_NAME = 'transcription-mailbox';

const getMailboxRef = () => getTranscriptionRef().child('mailbox');

const getHistoryIdRef = () => getMailboxRef().child('historyId');

const getGmailClient = async (...scopes: string[]) =>
  google.gmail({
    version: 'v1',
    auth: await getDomainWideDelegationClient(
      functions.config().transcription.coordinator.email_address,
      scopes
    ),
  });

export const watchMailbox = functions.pubsub
  .schedule('every 48 hours')
  .onRun(async () => {
    const gmail = await getGmailClient(
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.labels'
    );

    const doneLabel =
      // Finding an existing Done label
      unwrapGaxiosResponse(
        await gmail.users.labels.list({
          userId: 'me',
        })
      ).labels.find((l) => l.name === 'Done') ||
      // or creating one
      unwrapGaxiosResponse(
        await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: 'Done',
            messageListVisibility: 'show',
            labelListVisibility: 'labelShow',
          },
        })
      );

    // Setting permissions for Gmail according to https://developers.google.com/gmail/api/guides/push#grant_publish_rights_on_your_topic
    await new PubSub().topic(TOPIC_NAME).iam.setPolicy({
      bindings: [
        {
          members: ['serviceAccount:gmail-api-push@system.gserviceaccount.com'],
          role: 'roles/pubsub.publisher',
        },
      ],
    });

    const watchResponse = unwrapGaxiosResponse(
      await gmail.users.watch({
        userId: 'me',
        requestBody: {
          labelIds: [doneLabel.id],
          // Current project ID: https://firebase.google.com/docs/functions/config-env?gen=1st#automatically_populated_environment_variables
          topicName: `projects/${JSON.parse(process.env.FIREBASE_CONFIG).projectId}/topics/${TOPIC_NAME}`,
        },
      })
    );
    console.debug(watchResponse);
    await getHistoryIdRef().set(watchResponse.historyId);
  });

// This should match the `transcription/subject` email template
const allotmentSubjectRegex =
  /^(?:\w+: )?#?(?<id>\d+)(?: \(part (?<parts>\d(?:[-,\d]*\d)?)\))?: (?<language>\w+), (?<stage>\w+) - (?<assignee>.+)$/;

export const processTranscriptionEmails = functions
  .runWith({
    maxInstances: 1, // To avoid parallel handling of notifications
    memory: '256MB',
  })
  .pubsub.topic(TOPIC_NAME)
  .onPublish(async () => {
    const gmail = await getGmailClient(
      'https://www.googleapis.com/auth/gmail.readonly'
    );

    const history = unwrapGaxiosResponse(
      await gmail.users.history.list({
        userId: 'me',
        historyTypes: ['labelAdded'],
        startHistoryId: (await getHistoryIdRef().once('value')).val(),
      })
    );

    if (!history.history) return;

    const doneLabelId = (
      await getMailboxRef().child('labels/done').once('value')
    ).val();

    // Using Set to get unique ids
    const messageIds = new Set(
      history.history.flatMap(
        (item) =>
          item.labelsAdded?.flatMap((added) =>
            added.labelIds.includes(doneLabelId) &&
            // Assuming that id==threadId for the first message in the thread
            added.message.threadId === added.message.id
              ? [added.message.id]
              : []
          ) || []
      )
    );
    if (messageIds.size <= 0) {
      console.info('No messages to process.');
      return;
    }

    const subjects = await Promise.all(
      [...messageIds].map(
        async (id) =>
          unwrapGaxiosResponse(
            await gmail.users.messages.get({
              userId: 'me',
              id,
              format: 'metadata',
              metadataHeaders: ['Subject'],
              fields: 'payload/headers',
            })
          ).payload.headers[0]?.value
      )
    );

    const sheet = await Spreadsheet.open<AllotmentRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Allotments'
    );

    const rows = await sheet.getRows();

    const getRowIndex = (
      id: number,
      part: number,
      stage: string,
      assignee: string
    ) =>
      rows.findIndex(
        (row) =>
          row.ID === id &&
          row['Part Num'] === part &&
          // No translations yet
          row['Translation Language'] === null &&
          row.Stage === stage &&
          row.Devotee === assignee &&
          row.Status === Status.Given
      );

    const units = subjects?.flatMap((subject) => {
      const match = subject?.match(allotmentSubjectRegex);
      if (!match) {
        console.warn(`Cannot parse`, subject);
        return [];
      }

      const { id, stage, assignee } = match.groups;
      const parts = match.groups.parts
        ? mir.flatten(mir.parse(match.groups.parts))
        : null;
      return [
        {
          id: +id,
          parts,
          indices: (parts || [null]).map((part) =>
            getRowIndex(+id, part, stage, assignee)
          ),
        },
      ];
    });

    // Removing permissions on Google Docs
    await Promise.all(
      units.map(async ({ id, indices }) => {
        const [transcriptsFolder] = await listDriveFiles([
          Queries.mimeTypeIs(MimeTypes.Folder),
          Queries.parentIs(functions.config().transcription.folder.id),
          Queries.nameIs(id.toString()),
        ]);

        if (!transcriptsFolder) {
          console.warn('Cannot find folder for', id);
          return;
        }
        const docs = await listDriveFiles([
          Queries.mimeTypeIs(MimeTypes.Document),
          Queries.parentIs(transcriptsFolder.id),
        ]);

        await Promise.all(
          indices.map(async (index) => {
            const row = rows[index];
            const fileName = row['Part Num']
              ? fileNameForPart(id, row['Part Num'])
              : id.toString();
            const doc = docs.find((file) => file.name === fileName);
            if (!doc) {
              console.warn('Cannot find doc', fileName);
              return;
            }

            const permissions = await listPermissions(doc.id);
            const permission = permissions.find(
              (p) =>
                p.emailAddress === row.Email &&
                p.type === 'user' &&
                // inherited permissions could not be and should not be deleted
                p.permissionDetails?.some((detail) => !detail.inherited)
            );
            if (permission) await deletePermission(doc.id, permission.id);
          })
        );
      })
    );

    const doneUpdate: Partial<AllotmentRow> = {
      Status: Status.Done,
      'Date Done': DateTimeConverter.toSerialDate(DateTime.now()),
    };

    await sheet.updateRows(
      new Map(
        units.flatMap(({ indices }) =>
          indices.map(
            (index) => (
              console.info('Marking row', index + 2, 'as Done'),
              [index + 1, doneUpdate] as const
            )
          )
        )
      )
    );

    await getHistoryIdRef().set(history.historyId);
  });
