#!/usr/bin/env node
/*!
 * sri sri guru gauranga jayatah
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Using void operator to explicitly mark a promise as intentionally not awaited.
// https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-floating-promises.md
void yargs(hideBin(process.argv))
  .env('AUDIOSEVA')
  .scriptName('audioseva')
  .commandDir('commands')
  .demandCommand()
  .showHelpOnFail(false)
  .help().argv;
