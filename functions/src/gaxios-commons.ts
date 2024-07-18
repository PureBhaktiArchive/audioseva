import { GaxiosResponse } from 'googleapis-common';

export function unwrapGaxiosResponse<T>(response: GaxiosResponse<T>) {
  const { statusText, status, data } = response;
  if (statusText !== 'OK' || status !== 200)
    throw new Error(
      `Got ${status} (${statusText}) from ${response.config.url}.`
    );

  return data;
}
