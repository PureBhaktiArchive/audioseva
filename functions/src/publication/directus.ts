import { createDirectus, rest, staticToken } from '@directus/sdk';
import { AudioRecord } from './AudioRecord';
import { directusUrl, directusToken } from '../params';

type Schema = {
  audios: AudioRecord[];
};

export function getDirectus() {
  return createDirectus<Schema>(directusUrl.value())
    .with(staticToken(directusToken.value()))
    .with(rest());
}
