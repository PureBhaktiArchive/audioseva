/*!
 * sri sri guru gauranga jayatah
 */

import { IValidationRule } from './IValidationRule';

interface Predicate<T> {
  (entity: T, index?: number, array?: T[]): boolean;
}
export class ValidationRule<T> implements IValidationRule<T> {
  constructor(
    private spec: Predicate<T>,
    public message: string
  ) {}

  public validate(entity: T, index?: number, array?: T[]): boolean {
    return this.spec(entity, index, array);
  }
}

export class ValidationIssue<T> implements IValidationRule<T> {
  constructor(
    private violation: Predicate<T>,
    public message: string
  ) {}

  public validate(entity: T, index?: number, array?: T[]): boolean {
    return !this.violation(entity, index, array);
  }
}

export class ValidationRuleForEach<T> implements IValidationRule<T[]> {
  constructor(
    private spec: (value: T, index: number, array: T[]) => boolean,
    public message: string
  ) {}

  validate(entities: T[]): boolean {
    return entities.every(this.spec);
  }
}
