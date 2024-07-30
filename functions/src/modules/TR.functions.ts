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
import { MimeTypes, Queries, createDriveFile, listDriveFiles } from '../drive';
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

type Stage = 'TRSC' | 'FC1' | 'TTV' | 'DCRT' | 'LANG' | 'FC2' | 'FINAL';
type Language = 'English' | 'Hindi';

type AllotmentRow = {
  ID: number;
  'Part Num': number;
  'Translation Language'?: string;
  'Date Given': number;
  Status: Status;
  Stage: Stage;
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
  stage: Stage;
  language: Language;
  id: number;
  parts: number[];
  message: string;
};

type StageDescription = {
  name: string;
  guidelines: string;
} & Record<
  // Specific guidelines for various languages
  Language,
  {
    guidelines: string;
  }
>;

const fileNameForPart = (id: number, part: number) => `${id}.part-${part}`;

const getTranscriptionRef = () => getDatabase().ref('/transcription');

export const allot = functions.https.onCall(
  async (data: Allotment, context) => {
    authorize(context, ['TR.coordinator']);

    // Using destructuring to get the first matching file (folder)
    let [transcriptsFolder] = await listDriveFiles(
      functions.config().transcription.drive.id,
      [
        Queries.mimeTypeIs(MimeTypes.Folder),
        Queries.parentIs(functions.config().transcription.folder.id),
        Queries.nameIs(data.id.toString()),
      ]
    );

    // Creating a folder if it does not exist yet
    transcriptsFolder ||= await createDriveFile(
      data.id.toString(),
      MimeTypes.Folder,
      functions.config().transcription.folder.id
    );

    const existingDocs = await listDriveFiles(
      functions.config().transcription.drive.id,
      [
        Queries.mimeTypeIs(MimeTypes.Document),
        Queries.parentIs(transcriptsFolder.id),
      ]
    );

    const getGoogleDoc = (name: string) =>
      // First, trying to find an existing document
      existingDocs.find((file) => file.name === name) ||
      // Creating a new one if not found
      createDriveFile(name, MimeTypes.Document, transcriptsFolder.id);

    const googleDocLinks = await Promise.all(
      data.parts.length
        ? data.parts.map((part) => getGoogleDoc(fileNameForPart(data.id, part)))
        : [getGoogleDoc(data.id.toString())]
    ).then((docs) => docs.map((doc) => doc.webViewLink));

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
        'Google Doc': googleDocLinks[index],
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
            docLink: googleDocLinks[index],
          })),
          partsRanges: mir.stringify(mir.normalize(data.parts)),
          // These links are added only for the full file allotments
          ...(data.parts.length === 0 && {
            audioLink: `https://storage.googleapis.com/${functions.config().final?.publication?.bucket}/${data.id}.mp3`,
            docLink: googleDocLinks?.[0],
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
  /^#?(?<id>\d+)(?: \(part (?<parts>\d[-,\d]*\d)\))?: (?<language>English|Hindi|Bengali), (?<stage>\w+) - (?<assignee>.+)$/;

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
    console.info('Processing', subjects);

    const sheet = await Spreadsheet.open<AllotmentRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Allotments'
    );

    const rows = await sheet.getRows();
    const doneUpdate: Partial<AllotmentRow> = {
      Status: Status.Done,
      'Date Done': DateTimeConverter.toSerialDate(DateTime.now()),
    };

    const updates = subjects?.flatMap((subject) => {
      const match = subject?.match(allotmentSubjectRegex);
      if (!match) return [];

      const { id, stage, assignee } = match.groups;
      const parts = match.groups.parts
        ? mir.flatten(mir.parse(match.groups.parts))
        : [null]; // to match the whole file row

      const dataRowNumbers = parts.map(
        (part) =>
          rows.findIndex(
            (row) =>
              row.ID === +id &&
              row['Part Num'] === part &&
              // No translations yet
              row['Translation Language'] === null &&
              row.Stage === stage &&
              row.Devotee === assignee &&
              row.Status === Status.Given
          ) + 1
      );
      console.info(
        'Marking as Done the following data rows:',
        mir.stringify(mir.normalize(dataRowNumbers))
      );
      return dataRowNumbers
        .filter(Boolean)
        .map((dataRowNumber) => [dataRowNumber, doneUpdate] as const);
    });

    await sheet.updateRows(new Map(updates));

    await getHistoryIdRef().set(history.historyId);
  });
