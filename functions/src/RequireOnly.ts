/*!
 * sri sri guru gauranga jayatah
 */

export type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;
