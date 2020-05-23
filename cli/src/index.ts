#!/usr/bin/env node
/*!
 * sri sri guru gauranga jayatah
 */

import ora from 'ora';
import yargs from 'yargs';

const args = yargs.options({}).argv;

console.log(args);

const spinner = ora(`Scanning folder`).start();
setInterval(() => spinner.stop(), 3000);
