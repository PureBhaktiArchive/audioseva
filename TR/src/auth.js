import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { ref } from 'vue';
import { firebaseApp } from './firebase.js';

const auth = getAuth(firebaseApp);

// Undefined until we know for sure whether the user is authenticated or not
const user = ref(/** @type {import('firebase/auth').User} */ (undefined));

onAuthStateChanged(auth, async (newUser) => {
  user.value = newUser;
});

export const useAuth = () => ({
  user,
  signIn: () => signInWithRedirect(auth, new GoogleAuthProvider()),
  signOut: () => signOut(auth),
});
