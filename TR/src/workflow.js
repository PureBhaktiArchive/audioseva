/**
 * @typedef {object} StageAttributes
 * @property {boolean} [forParts]
 * @property {boolean} [optional]
 * @property {string[]} [forLanguages]
 * @property {string} [skill] Denotes which skill is suitable for the stage. Used instead of the stage name.
 */

/** @type {[Stage, StageAttributes][]} */
const stages = [
  ['TRSC', { forParts: true }],
  ['FC1', { forParts: true }],
  ['DCRT', { forLanguages: ['English'] }],
  ['VRBT', { optional: true, skill: 'FC1' }],
  ['LANG', {}],
  ['TTV', { optional: true }],
  ['FC2', {}],
  ['PR', { optional: true }],
  ['FINAL', {}],
];

/**
 * Returns stages in their natural order, filtered by the proided skills set
 * @param {string[]} skills
 * @param {string} language
 * @returns
 */
export const getStagesForSkillsAndLanguage = (skills, language) =>
  stages.flatMap(([stage, options]) =>
    skills.includes(options.skill ?? stage) &&
    (options.forLanguages?.includes(language) ?? true)
      ? [stage]
      : []
  );

/**
 * @param {FileToAllot | Part} unit
 * @param {Stage} stage Stage to be allotted for
 * @returns {Boolean}
 */
const canUnitBeAllottedForStage = function (unit, stage) {
  let reachedLatestStage = !unit.latestStage;
  for (const [code, attributes] of stages) {
    // Skipping stages up to the latest one, included
    if (!reachedLatestStage) {
      // Cannot allot for a past stage
      if (code === stage) return false;
      if (code === unit.latestStage) reachedLatestStage = true;
      continue;
    }

    const isStageSuitable =
      // Emulating XOR: either full file xor stage is for parts
      'id' in unit !== !!attributes.forParts &&
      // Some stages are suitable for particular languages only
      (!('languages' in unit) ||
        !attributes.forLanguages ||
        attributes.forLanguages.some((language) =>
          unit.languages.includes(language)
        ));

    if (code !== stage)
      if (attributes.optional || !isStageSuitable)
        // Optional or not suitable stages can be skipped
        continue;
      // Current stage is not the requested one and it cannot be skipped
      else return false;

    return isStageSuitable;
  }
};

/**
 * Whether a unit can be allotted for a given stage
 * @param {FileToAllot | Part} unit Unit to allot, either a file or a part
 * @param {Stage} [stage] Stage to be allotted for. If `null` then no workflow checks are done.
 * @returns {Boolean}
 */
export const canUnitBeAllotted = (unit, stage = null) =>
  !unit.completed &&
  // A unit should not be in progress currently
  (!unit.latestStatus || unit.latestStatus === 'Done') &&
  // For whole files there should be no incompleted parts
  (!('parts' in unit) || !unit.parts?.some((part) => !part.completed)) &&
  // Workflow checks only if stage is specified
  (!stage || canUnitBeAllottedForStage(unit, stage));
