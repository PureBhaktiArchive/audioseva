import { createDirectus, rest, staticToken } from '@directus/sdk';
import * as functions from 'firebase-functions';
import { FinalRecord } from './FinalRecord';

type Schema = {
  audios: FinalRecord[];
};

export const directus = createDirectus<Schema>(
  functions.config().directus.url as string
)
  .with(staticToken(functions.config().directus.token as string))
  .with(rest());
