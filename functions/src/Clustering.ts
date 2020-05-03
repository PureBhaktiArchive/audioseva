/*!
 * sri sri guru gauranga jayatah
 */

import _ = require('lodash');

export const clusterize = function <
  T extends { [key in P]: string },
  P extends keyof T
>(items: Array<T>, ...keyProperties: Array<P & keyof T>): string[] {
  const combinations = _(items)
    .map((i) => _.at<string>(i, keyProperties).filter((v) => !!v))
    .value();

  /// This is a mapping from the cluster key to the cluster set
  const clusters = _.transform(
    combinations,
    (result, combination) => {
      // Merging the current combination with all the clusters of the keys in the combination
      const mergedCluster = new Set([
        ...combination,
        ..._.flatMap(combination, (key) => [...(result.get(key) || [])]),
      ]);
      // Updating cluster for each key in the merged cluster
      mergedCluster.forEach((key) => result.set(key, mergedCluster));
    },
    new Map<string, Set<string>>()
  );

  // Converting cluster keys into compund strings
  return _.map(combinations, (c) =>
    _([...clusters.get(c[0])])
      .sort()
      .join('+')
  );
};
