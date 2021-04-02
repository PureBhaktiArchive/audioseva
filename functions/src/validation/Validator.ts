/*!
 * sri sri guru gauranga jayatah
 */

import { IValidationRule } from './IValidationRule';
import { ValidationResult } from './ValidationResult';

export interface IValidator<T> {
  validate(entity: T, index?: number, array?: T[]): ValidationResult;
}

export abstract class Validator<T> implements IValidator<T> {
  constructor(protected rules: IValidationRule<T>[]) {}

  validate(entity: T, index?: number, array?: T[]): ValidationResult {
    const errors = this.rules
      .map((rule) =>
        rule.validate(entity, index, array) ? undefined : rule.message
      )
      .filter(Boolean);

    return {
      isValid: errors.length === 0,
      messages: errors,
    };
  }
}
