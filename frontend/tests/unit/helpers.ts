import { store } from "@/store";

export const mockClaims = async (roles: { [key: string]: any }) => {
  await store.dispatch("user/handleUser", {
    getIdTokenResult: () => ({ claims: { roles } })
  });
};
