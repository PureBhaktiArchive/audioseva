/*!
 * sri sri guru gauranga jayatah
 */

import { Argv } from 'yargs';

export const command = 'digi <command>';
export const desc = 'Manage digi files';
export const builder = (yargs: Argv): Argv => yargs.commandDir('digi');
