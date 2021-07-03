/*!
 * sri sri guru gauranga jayatah
 */

const { readFileSync, writeFileSync } = require('fs');

const tasks = JSON.parse(readFileSync('tasks.json'));
writeFileSync(
  'tasks.txt',
  Object.entries(tasks)
    .map(([id, task]) => `${id}\t${task.chunks ? task.chunks.length : 0}`)
    .join('\n')
);
