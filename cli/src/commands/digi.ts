/*!
 * sri sri guru gauranga jayatah
 */

import { Argv } from 'yargs';

exports.command = 'digi <command>';
exports.desc = 'Manage digi files';
exports.builder = (yargs: Argv) => yargs.commandDir('digi');
exports.handler = function (argv) {};
