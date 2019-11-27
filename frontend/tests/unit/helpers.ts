import { store } from "@/store";

export const mockClaims = async (claims: { [key: string]: any }) => {
  await store.commit("user/setCurrentUser", {
    getIdTokenResult: () => ({ claims })
  });
};
