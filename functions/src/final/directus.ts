import { createDirectus, rest, staticToken } from '@directus/sdk';
import * as functions from 'firebase-functions';
import { NormalRecord } from './FinalRecord';

type Schema = {
  audios: NormalRecord[];
};

export const directus = createDirectus<Schema>(
  functions.config().directus.url as string
)
  .with(staticToken(functions.config().directus.token as string))
  .with(rest());
