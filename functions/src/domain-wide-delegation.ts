// Taken from https://github.com/googleapis/google-auth-library-nodejs/issues/916#issuecomment-2195661261
/**
 * Other resources:
 * https://jpassing.com/2022/01/15/using-domain-wide-delegation-on-google-cloud-without-service-account-keys/
 * https://stackoverflow.com/questions/59601045/gcp-cloud-function-domain-wide-delegation-using-application-default-credential
 * https://github.com/googleapis/google-auth-library-nodejs/issues/916 -- without a key file
 * https://github.com/googleapis/google-api-nodejs-client/issues/3107 -- duplicate of the above
 * https://github.com/googleapis/google-api-nodejs-client/issues/1699 -- with a key file
 *
 */

import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { unwrapGaxiosResponse } from './gaxios-commons';

const GOOGLE_OAUTH2_TOKEN_API_URL = 'https://oauth2.googleapis.com/token';

/**
 * This function generates an OAuth2 Access Token with scopes obtained via domain-wide delegation
 * without requiring a JSON key file from a Service Account.
 *
 * Resources:
 *  - https://github.com/googleapis/google-auth-library-nodejs/issues/916
 *  - https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys#domain-wide-delegation
 *
 * @param subject Email address of the Google account that has granted domain-wide scopes to the service account
 * @param scopes Scopes to request for the generated Access Token
 * @returns the generated access token
 */
export async function getDomainWideDelegationClient(
  subject: string,
  scopes: string[]
): Promise<OAuth2Client> {
  // Build client using Application Default Credentials
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const now = Math.floor(new Date().getTime() / 1000);
  const serviceAccountEmail = (await auth.getCredentials()).client_email;

  const signedJwt = unwrapGaxiosResponse(
    // Sign JWT token using a system-managed private key of the given service account
    await google.iamcredentials('v1').projects.serviceAccounts.signJwt({
      name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
      requestBody: {
        // Build JWT token for domain-wide delegation
        payload: JSON.stringify({
          iss: serviceAccountEmail,
          aud: GOOGLE_OAUTH2_TOKEN_API_URL,
          iat: now,
          exp: now + 10 * 60,
          sub: subject ?? undefined,
          // Yes, this is a space delimited list.
          // Not a typo, the API expects the field to be "scope" (singular).
          scope: scopes?.join(' '),
        }),
      },
      auth,
    })
  ).signedJwt;

  return new OAuth2Client({
    credentials: {
      access_token: await getAccessToken(signedJwt),
    },
  });
}

/**
 * We need to send this request using an alternative http client because we want to use a JWT (JSON Web Token) for Domain-Wide Delegation of Authority.
 * The Google Auth Library for Node.js does not provide a built-in method for this specific use case.
 * See: https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys#domain-wide-delegation
 */
async function getAccessToken(signedJwt: string): Promise<string> {
  const url = GOOGLE_OAUTH2_TOKEN_API_URL;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const body = new URLSearchParams();
  body.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  body.append('assertion', signedJwt);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      body: body.toString(),
      headers,
    });
    if (resp.status < 200 || resp.status > 299) {
      throw new Error(
        `Failed to call ${url}: HTTP ${resp.status}: ${await resp.text()}`
      );
    }
    const data = (await resp.json()) as { access_token: string };
    return data.access_token;
  } catch (err) {
    throw new Error(
      `Failed to generate Google Cloud Domain Wide Delegation OAuth 2.0 Access Token: ${err}`
    );
  }
}
