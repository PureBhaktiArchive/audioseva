/*!
 * sri sri guru gauranga jayatah
 */

export interface IValidationRule<T> {
  readonly message: string;
  validate(entity: T): boolean;
}
