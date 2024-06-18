import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createApp, ref } from 'vue';
import './firebase.js';

const app = createApp({
  setup() {
    const assignees = ref(/** @type {Assignee[]} */ (null));
    const selectedDevotee = ref(null);

    // Undefined until we know for sure whether the user is authenticated or not
    const user = ref(/** @type {import('firebase/auth').User} */ (undefined));
    onAuthStateChanged(getAuth(), async (userUpdated) => {
      user.value = userUpdated;
    });

    async function loadAssignees() {
      /** @type {import('firebase/functions').HttpsCallable<{phase:string}, Assignee[]> } */
      const getAssignees = httpsCallable(getFunctions(), 'User-getAssignees');
      assignees.value = (await getAssignees({ phase: 'TRSC' })).data;
    }

    async function signIn() {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(getAuth(), provider);
    }
    async function signOutHandler() {
      await signOut(getAuth());
    }

    return {
      assignees,
      selectedDevotee,
      loadAssignees,

      user,
      signIn,
      signOut: signOutHandler,
    };
  },
});

app.mount('#app');
