import { initializeApp } from 'firebase/app';
import { getAuth, getRedirectResult } from 'firebase/auth';

export const firebaseApp = initializeApp({
  ...JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG),
  // Patching the authDomain property according to https://firebase.google.com/docs/auth/web/redirect-best-practices
  // Option 1 in production, Option 3 in development. In both options, patching authDomain is needed.
  authDomain: window.location.host,
});

// Running this each time because who knows if there was a redirect.
getRedirectResult(getAuth());
