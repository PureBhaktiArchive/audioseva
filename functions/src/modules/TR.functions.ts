/*
 * sri sri guru gauranga jayatah
 */
import { ServerValue, getDatabase } from 'firebase-admin/database';
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { DateTimeConverter, secondsInDay } from '../DateTimeConverter';
import { Person } from '../Person';
import { Spreadsheet } from '../Spreadsheet';
import { StorageManager } from '../StorageManager';
import { authorize } from '../auth';
import { MimeTypes, Queries, createDriveFile, listDriveFiles } from '../drive';
import { toRange } from '../range';

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
      number: row.Part,
      duration: row.Duration * secondsInDay,
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
    row.Completed?.toUpperCase() === Completed.Yes ||
    // Filtering Given files (as wholes)
    row['Latest Status'] === Status.Given
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
  language: string;
  id: number;
  parts: number[];
  message: string;
};

type StageDescription = {
  name: string;
  guidelines: string;
};

const fileNameForPart = (id: number, part: number) => `${id}.part-${part}`;

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
      await getDatabase()
        .ref(`/transcription/stages/${data.stage}`)
        .once('value')
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
          partsRanges: toRange(data.parts),
          // These links are added only for the full file allotments
          ...(data.parts.length === 0 && {
            audioLink: `https://storage.googleapis.com/${functions.config().final?.publication?.bucket}/${data.id}.mp3`,
            docLink: googleDocLinks?.[0],
          }),
          stageName: stageDescription?.name,
          guidelinesLink: stageDescription?.guidelines,
        },
      });
  }
);
