import { store } from "@/store";

export const mockClaims = async (roles?: { [key: string]: any }) => {
  if (!roles) {
    return await store.dispatch("user/handleUser", null);
  }
  await store.dispatch("user/handleUser", {
    getIdTokenResult: () => ({ claims: { roles } }),
  });
  // allow clean up after a test
  return async () => {
    await store.dispatch("user/handleUser", null);
  };
};
