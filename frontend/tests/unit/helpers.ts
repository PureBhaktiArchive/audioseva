import { store } from "@/store";

export const mockClaims = async (roles?: { [key: string]: any }) => {
  if (!roles) {
    return await store.dispatch("user/handleInitialUserLoad", null);
  }
  await store.dispatch("user/handleInitialUserLoad", {
    getIdTokenResult: () => ({ claims: { roles } })
  });
  // allow clean up after a test
  return async () => {
    await store.dispatch("user/handleInitialUserLoad", null);
  };
};
