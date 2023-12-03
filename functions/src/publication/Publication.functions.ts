import { database } from 'firebase-admin';
import * as functions from 'firebase-functions';
import { FidelityCheckRecord } from '../FidelityCheck/FidelityCheckRecord';
import { FinalRecord } from './FinalRecord';
import { createFinalRecords } from './finalization';

export const finalize = functions.database
  .ref('/final/trigger')
  .onWrite(async () => {
    const [fidelitySnapshot, finalSnapshot] = await Promise.all([
      database().ref('/FC/records').once('value'),
      database().ref('/final/records').once('value'),
    ]);

    if (!fidelitySnapshot.exists()) return;

    /**
     * Since we are using integer keys, Firebase can return either an array or an object
     * https://firebase.googleblog.com/2014/04/best-practices-arrays-in-firebase.html
     * For this reason we’re using `Object.entries` which work identical for both data structures.
     */

    const fidelityRecords = Object.entries<FidelityCheckRecord>(
      fidelitySnapshot.val() as Record<string, FidelityCheckRecord>
    );

    const finalRecords = Object.entries<FinalRecord>(
      finalSnapshot.val() as Record<string, FinalRecord>
    ).flatMap(([fileId, record]): [number, FinalRecord][] =>
      // Keeping only numeric keys (just in case, should be only numeric)
      /\d+/.test(fileId) ? [[+fileId, record]] : []
    );

    await finalSnapshot.ref.set(
      Object.fromEntries(createFinalRecords(fidelityRecords, finalRecords))
    );
  });
