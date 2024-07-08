/*
 * sri sri guru gauranga jayatah
 */
import * as functions from 'firebase-functions';
import { DateTime } from 'luxon';
import { DateTimeConverter, secondsInDay } from '../DateTimeConverter';
import { Person } from '../Person';
import { Spreadsheet } from '../Spreadsheet';
import { authorize } from '../auth';

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
  'Date Given': number;
  Status: Status;
  Stage: Stage;
  // 'Target Language': string;
  'Google Doc'?: string;
  'Last Modified'?: string;
  Devotee: string;
  Email: string;
  Comments?: string;
  Feedback?: string;
  'Reference file'?: string;
  'Date Done'?: number;
  Completed?: boolean;
};

type Allotment = {
  assignee: Person;
  stage: Stage;
  id: number;
  parts: number[];
  message: string;
};

export const allot = functions.https.onCall(
  async (data: Allotment, context) => {
    authorize(context, ['TR.coordinator']);
    const sheet = await Spreadsheet.open<AllotmentRow>(
      functions.config().transcription.spreadsheet.id as string,
      'Allotments'
    );
    await sheet.appendRows(
      (data.parts.length ? data.parts : [null]).map((part) => ({
        ID: data.id,
        'Part Num': part,
        Stage: data.stage,
        Status: Status.Given,
        'Date Given': DateTimeConverter.toSerialDate(DateTime.now()),
        Devotee: data.assignee.name,
        Email: data.assignee.emailAddress,
      }))
    );
  }
);
