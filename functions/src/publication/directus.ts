import { createDirectus, rest, staticToken } from '@directus/sdk';
import * as functions from 'firebase-functions/v1';
import { AudioRecord } from './AudioRecord';

type Schema = {
  audios: AudioRecord[];
};

export const directus = createDirectus<Schema>(
  functions.config().directus.url as string
)
  .with(staticToken(functions.config().directus.token as string))
  .with(rest());
