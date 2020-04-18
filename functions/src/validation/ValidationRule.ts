/*!
 * sri sri guru gauranga jayatah
 */

import { IValidationRule } from './IValidationRule';

export class ValidationRule<T> implements IValidationRule<T> {
  constructor(private spec: (entity: T) => boolean, public message: string) { }

  public validate(entity: T): boolean {
    return this.spec(entity);
  }
}

export class ValidationRuleForEach<T> implements IValidationRule<T[]> {
  constructor(
    private spec: (value: T, index: number, array: T[]) => boolean,
    public message: string
  ) { }

  validate(entities: T[]): boolean {
    return entities.every(this.spec);
  }
}
