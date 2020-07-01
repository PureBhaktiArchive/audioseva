#!/usr/bin/env node
/*!
 * sri sri guru gauranga jayatah
 */

import yargs from 'yargs';

yargs
  .env('AUDIOSEVA')
  .scriptName('audioseva')
  .commandDir('commands')
  .demandCommand()
  .showHelpOnFail(false)
  .help().argv;
