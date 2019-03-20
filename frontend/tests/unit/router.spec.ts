import firebase from "firebase/app";
import { routerBeforeEach } from "@/router";

jest.mock("firebase/app", () => ({
  auth: jest.fn(() => ({
    currentUser: {
      getIdTokenResult: async () => {
        return await {
          claims: { SE: true }
        };
      }
    }
  }))
}));

describe("routerBeforeEach", () => {
  let to: any;
  let from: any = {};
  let next: any;

  beforeEach(() => {
    next = jest.fn();
  });

  it("should redirect to / if guestOnly and currentUser", async () => {
    to = {
      matched: [{ meta: { auth: { guestOnly: true } } }]
    };
    await routerBeforeEach(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith("/");
  });

  it("should redirect to /login if requireAuth and no currentUser", async () => {
    (firebase.auth as any).mockImplementationOnce(() => ({
      currentUser: null
    }));
    to = {
      fullPath: "/sqr",
      matched: [{ meta: { auth: { requireAuth: true } } }]
    };
    await routerBeforeEach(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({
      path: "/login",
      query: { redirect: to.fullPath }
    });
  });

  it("should allow route with no auth meta", async () => {
    to = {
      matched: [{ meta: {} }]
    };
    await routerBeforeEach(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should not redirect on correct claims", async () => {
    to = {
      matched: [{ meta: { auth: { requireClaims: { SE: true } } } }]
    };
    await routerBeforeEach(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should redirect to /restricted on bad custom claims", async () => {
    to = {
      matched: [{ meta: { auth: { requireClaims: { SQR: true } } } }]
    };
    const from: any = {};
    const next: any = jest.fn();
    await routerBeforeEach(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith("/restricted");
  });
});
