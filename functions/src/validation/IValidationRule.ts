/*!
 * sri sri guru gauranga jayatah
 */

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IValidationRule<T> {
  readonly message: string;
  validate(entity: T): boolean;
}
