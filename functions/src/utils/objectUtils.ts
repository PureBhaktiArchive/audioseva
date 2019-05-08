import * as _ from "lodash";

export const objectWithDefaults = (obj: any, properties: string[], defaultVal: any = 0) => {
  const defaults = properties.reduce((defaultProperties, property) => {
    _.set(defaultProperties, property, defaultVal);
    return defaultProperties;
  }, {});
  return _.merge(defaults, obj);
};
