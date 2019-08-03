/*!
 * sri sri guru gauranga jayatah
 */

import { SQRWorkflow } from '../../classes/SQRWorkflow';

export const importAllotments = async () => {
  await SQRWorkflow.importAllotments();
};

export const importSubmissions = async () => {
  await SQRWorkflow.importSubmissions();
};
