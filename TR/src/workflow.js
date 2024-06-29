/** @type {Stage[]} */
const stagesForParts = ['TRSC', 'FC1'];

/** @type {Map<Stage, Stage[]>} */
const preceedingStages = new Map([
  ['TRSC', [null]],
  ['FC1', ['TRSC']],
  ['TTV', [null]],
  ['DCRT', [null, 'TTV']],
  ['LANG', ['DCRT']],
  ['FC2', ['LANG']],
  ['FINAL', ['FC2']],
]);

/**
 * @param {Stage} stage1
 * @param {Stage} stage2
 * @returns {Boolean}
 */
const canStageComeAfterAnother = (stage1, stage2) =>
  preceedingStages.get(stage2)?.includes(stage1);

/**
 *
 * @param {FileToAllot} file
 * @param {Stage} stage
 * @returns {Boolean}
 */
export const canFileBeAllottedForStage = (file, stage) =>
  stagesForParts.includes(stage)
    ? file.parts?.some((part) =>
        canStageComeAfterAnother(part.latestStage, stage)
      ) || false
    : file.parts?.every((part) => part.completed) &&
      canStageComeAfterAnother(file.latestStage, stage);
