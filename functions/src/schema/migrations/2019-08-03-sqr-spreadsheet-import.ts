/*!
 * sri sri guru gauranga jayatah
 */

import { SQRWorkflow } from '../../SoundQualityReporting/SQRWorkflow';

export const importAllotments = async () => {
  await SQRWorkflow.importAllotments();
};

export const importSubmissions = async () => {
  await SQRWorkflow.importSubmissions();
};
