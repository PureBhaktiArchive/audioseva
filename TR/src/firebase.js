import { initializeApp } from 'firebase/app';
import { getAuth, getRedirectResult } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export const firebaseApp = initializeApp({
  ...JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG),
  // Patching the authDomain property according to https://firebase.google.com/docs/auth/web/redirect-best-practices
  // Option 1 in production, Option 3 in development. In both options, patching authDomain is needed.
  authDomain: window.location.host,
});

// Instrumenting the firebase app to use a local emulator for functions
// https://firebase.google.com/docs/functions/local-emulator#instrument-functions
if (import.meta.env.DEV)
  connectFunctionsEmulator(
    getFunctions(firebaseApp),
    import.meta.env.VITE_FUNCTIONS_HOST || 'localhost',
    import.meta.env.VITE_FUNCTIONS_PORT || 5001
  );
// Running this each time because who knows if there was a redirect.
getRedirectResult(getAuth());
