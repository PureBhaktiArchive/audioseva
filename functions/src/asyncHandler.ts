/*!
 * sri sri guru gauranga jayatah
 */

import { NextFunction, Request, Response } from 'express';

/**
 * Wraps async function to make it compatible with expressjs handler.
 *
 * Borrowed from http://expressjs.com/en/advanced/best-practice-performance.html#use-promises
 * and adapted for TypeScript.
 *
 * Also converts the return type to just `void` instead of `Promise<void>,
 * which is needed due to `typescript-eslint` error `no-misused-promises`.
 * More details: https://github.com/typescript-eslint/typescript-eslint/issues/1637.
 *
 * @param fn Async function to wrap
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
