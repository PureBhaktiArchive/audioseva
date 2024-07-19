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
 * Whether a unit can be allotted for a given stage
 * @param {FileToAllot | Part} unit Unit to allot, either a file or a part
 * @param {Stage} [stage] Stage to be allotted for. If `null` then no workflow checks are done.
 * @returns {Boolean}
 */
export const canUnitBeAllotted = (unit, stage = null) =>
  !unit.completed &&
  // A unit should not be in progress currently
  unit.latestStatus !== 'Given' &&
  // Workflow checks only if stage is specified
  (!stage ||
    (canStageComeAfterAnother(unit.latestStage, stage) &&
      ('id' in unit
        ? // and only specific stages are allowed
          !stagesForParts.includes(stage) &&
          // For whole files, all parts should be completed if present
          unit.parts?.every((part) => part.completed)
        : // For parts, only specific stages are allowed
          stagesForParts.includes(stage))));
