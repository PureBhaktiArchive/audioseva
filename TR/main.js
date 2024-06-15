import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  signOut as authSignOut,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
} from 'firebase/auth';
import { createApp, onMounted, ref } from 'vue';

initializeApp(JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG));

const auth = getAuth();
// Running this each time because who knows if there was a redirect.
getRedirectResult(auth);

const app = createApp({
  setup() {
    const devotees = ref(/** @type {Assignee[]} */ ([]));
    const selectedDevotee = ref(null);

    // Undefined until we know for sure whether the user is authenticated or not
    const user = ref(/** @type {import('firebase/auth').User} */ (undefined));
    onAuthStateChanged(auth, async (userUpdated) => {
      user.value = userUpdated;
    });

    onMounted(async () => {
      const response = await fetch(import.meta.env.VITE_DEVOTEES_URL);
      devotees.value = /**@type {Assignee[]} */ (await response.json()).filter(
        (item) => !!item.emailaddress
      );
    });

    async function signIn() {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    }
    async function signOut() {
      await authSignOut(auth);
    }

    return {
      devotees,
      selectedDevotee,

      user,
      signIn,
      signOut,
    };
  },
});

app.mount('#app');
