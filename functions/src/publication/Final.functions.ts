/*!
 * sri sri guru gauranga jayatah
 */

import { createItem, readItems, updateItem } from '@directus/sdk';
import { database } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as functions from 'firebase-functions';
import * as path from 'path';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { StorageManager } from '../StorageManager';
import { makeIterable } from '../utils';
import { directus } from './directus';
import { createFinalRecords as generateFinalRecords } from './finalization';
import pMap = require('p-map');

export const publish = functions.database
  .ref('/FC/publish/trigger')
  .onWrite(async () => {
    const fidelitySnapshot = await database().ref('/FC/records').once('value');

    if (!fidelitySnapshot.exists()) return;

    const fidelityRecords = new Map(
      makeIterable(
        fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
      )
    );

    console.log('Got FC records:', fidelityRecords.size);

    // TODO: fetch duration
    const finalRecords = await directus.request(readItems('audios'));
    await pMap(
      generateFinalRecords(fidelityRecords, finalRecords.slice(0, 1)),
      ({ isNew, file, record }) => {
        return Promise.all([
          // Copying the finalized file into a separate `final` bucket
          getStorage()
            .bucket(file.bucket)
            .file(file.name, { generation: file.generation })
            .copy(
              StorageManager.getBucket('final').file(
                `${record.id}${path.extname(file.name)}`
              ),
              {
                contentType: 'audio/flac',
                metadata: {
                  metadata: {
                    source: `${file.bucket}/${file.name}#${file.generation}`,
                  },
                },
              }
            ),
          // Saving the record into the CMS
          directus.request(
            // Upsert functionality is not yet available in Directus, though being considered: https://github.com/directus/directus/discussions/5706
            // Until then we have to separately update and create
            isNew
              ? (console.log('creating', record.id),
                createItem('audios', record))
              : (console.log('updating', record.id),
                updateItem('audios', record.id, record))
          ),
        ]);
      },
      { concurrency: 1 }
    ).catch(console.error);
  });
