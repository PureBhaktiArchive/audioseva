import { store } from '@/store';

const setUserAndRoles = async (
  user: boolean,
  roles?: { [key: string]: any } | null
) => {
  store.commit(
    "user/setCurrentUser",
    user
      ? {
          getIdTokenResult: () => ({ claims: { roles } })
        }
      : null
  );
  await store.dispatch("user/updateUserRoles");
};

export const mockClaims = async (roles?: { [key: string]: any }) => {
  if (!roles) {
    return await setUserAndRoles(false, null);
  }
  await setUserAndRoles(true, roles);
  // allow clean up after a test
  return async () => {
    await setUserAndRoles(false, null);
  };
};
