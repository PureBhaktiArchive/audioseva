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
  const fileCountPath = `/lists/${params.fileName.split("-")[0]}/${phase}`;
  const fileCount = objectWithDefaults(
      (await admin.database().ref(fileCountPath).once("value")).val() || {},
      [...statuses, "Spare"]
  );
  fileCount[snapshot.val()] += 1;
  return admin.database().ref(fileCountPath).update(fileCount);
};

export const onUpdateFileCountByStatus = (phase: string) => async (
    { before, after }: functions.Change<functions.database.DataSnapshot>,
    { params }: functions.EventContext
) => {
  const oldStatus = before.val();
  const status = after.val();
  const fileCountPath = `/lists/${params.fileName.split("-")[0]}/${phase}`;
  const fileCount = (await admin.database().ref(fileCountPath).once("value")).val();
  if (fileCount[oldStatus] - 1 > -1) fileCount[oldStatus] -= 1;
  if (status) fileCount[status] += 1;
  return admin.database().ref(fileCountPath).update(fileCount);
};
