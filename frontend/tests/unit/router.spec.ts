import firebase from "firebase/app";
import { checkAuth, redirectSections } from "@/router";
import { mockClaims } from "./HomePageButtons.spec";

describe("redirectSections", () => {
  let to: any;
  let from: any = {};
  let next: any;

  beforeEach(() => {
    next = jest.fn();
  });

  test.each`
    claims                   | toProps                | expectedPath
    ${{ TE: true }}          | ${{ fullPath: "/te" }} | ${"/te/my"}
    ${{ coordinator: true }} | ${{ fullPath: "/te" }} | ${"/te/tasks"}
  `(
    "should redirect to first available child route that matches claims $claims",
    async ({
      claims,
      expectedPath,
      toProps: { fullPath, toClaims = { coordinator: true } }
    }) => {
      await mockClaims(claims);
      to = {
        fullPath: fullPath,
        meta: {
          activator: true,
          auth: { requireClaims: toClaims }
        }
      };
      await redirectSections(to, from, next);
      expect(next).toHaveBeenCalledWith(expectedPath);
    }
  );
});

describe("checkAuth", () => {
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
    await checkAuth(to, from, next);
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
    await checkAuth(to, from, next);
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
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should not redirect on correct claims", async () => {
    (firebase.auth as any).mockImplementationOnce(() => ({
      currentUser: {
        getIdTokenResult: async () => {
          return {
            claims: { TE: true }
          };
        }
      }
    }));

    to = {
      matched: [{ meta: { auth: { requireClaims: { TE: true } } } }]
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("should redirect to / on bad custom claims", async () => {
    to = {
      matched: [{ meta: { auth: { requireClaims: { SQR: true } } } }]
    };
    const from: any = {};
    const next: any = jest.fn();
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith("/");
  });
});
