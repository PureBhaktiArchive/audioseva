import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  signOut as authSignOut,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createApp, ref } from 'vue';

initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

const auth = getAuth();
// Running this each time because who knows if there was a redirect.
getRedirectResult(auth);

const app = createApp({
  setup() {
    const assignees = ref(/** @type {Assignee[]} */ (null));
    const selectedDevotee = ref(null);

    // Undefined until we know for sure whether the user is authenticated or not
    const user = ref(/** @type {import('firebase/auth').User} */ (undefined));
    onAuthStateChanged(auth, async (userUpdated) => {
      user.value = userUpdated;
    });

    async function loadAssignees() {
      /** @type {import('firebase/functions').HttpsCallable<{phase:string}, Assignee[]> } */
      const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
      assignees.value = (await getAssignees({ phase: 'TRSC' })).data;
    }
    async function signIn() {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    }
    async function signOut() {
      await authSignOut(auth);
    }

    return {
      assignees,
      selectedDevotee,
      loadAssignees,

      user,
      signIn,
      signOut,
    };
  },
});

app.mount('#app');
