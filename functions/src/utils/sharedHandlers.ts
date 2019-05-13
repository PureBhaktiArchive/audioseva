import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { objectWithDefaults } from "./objectUtils";

export const statuses = ["Given", "Submitted", "Done", "Revise"];

// groups multiple firebase function handlers into one handler
export const runHandlers = (...handlers: any[]) => (...args: any[]) => {
  return Promise.all([
      ...handlers.map((handler) => handler(...args).catch((e) => e))
  ]);
};

export const onCreateFileCountByStatus = (phase: string) => async (
    snapshot: admin.database.DataSnapshot,
    { params }: functions.EventContext
) => {
  const status = snapshot.val();
  return admin.database().ref(`/lists/${params.fileName.split("-")[0]}/${phase}`).transaction((count) => {
    if (count) {
      count[status]++;
      return count;
    } else {
      return objectWithDefaults(
          { [status]: 1 },
          [...statuses, "Spare"]
      );
    }
  })
};

export const onUpdateFileCountByStatus = (phase: string) => async (
    { before, after }: functions.Change<functions.database.DataSnapshot>,
    { params }: functions.EventContext
) => {
  const oldStatus = before.val();
  const status = after.val();
  return admin.database().ref(`/lists/${params.fileName.split("-")[0]}/${phase}`).transaction((count) => {
    if (status) count[status]++;
    if (count[oldStatus]) count[oldStatus]--;
    return count;
  })
};
