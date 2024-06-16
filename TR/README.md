## Environment variables

https://vitejs.dev/guide/env-and-mode.html

| Variable               | Description             |
| ---------------------- | ----------------------- |
| `VITE_FIREBASE_CONFIG` | Firebase Config as JSON |

## Firebase Authentication

In order for the Firebase authentication to work in development on localhost, we need to proxy auth requests to firebaseapp.com according to the [documentation](https://firebase.google.com/docs/auth/web/redirect-best-practices#proxy-requests).

This approach involves several steps:

1. A reverse proxy is configured in the [`vite.config.js`](vite.config.js) file to proxy auth requests to firebaseapp.com.
2. The `authDomain` property in the Firebase Config is patched with the current host in the [`firebase.js`](firebase.js) file. This is done in production as well, though not strictly necessary because we can put proper `authDomain` in the `VITE_FIREBASE_CONFIG` env variable. Though the patching approach seems more reliable because we can just use a stock Firebase Config from the console.
3. The HTTPS server is configured in the [`vite.config.js`](vite.config.js) file. This is necessary because Firebase Auth treats `authDomain` as an HTTPS endpoint, and this is not configurable. For this reason there is a self-signed certificate `localhost.pfx` with the password `1` in the repo genereated with the following PowerShell script (see https://blog.admindroid.com/how-to-create-self-signed-certificate-using-powershell/):

```pwsh
$Certificate = New-SelfSignedCertificate -DnsName "localhost" -FriendlyName "For NodeJS" -CertStoreLocation Cert:\CurrentUser\My
$Pwd = ConvertTo-SecureString -String "1" -Force -AsPlainText
Export-PfxCertificate -Cert $Certificate -FilePath "localhost.pfx" -Password $Pwd
```
