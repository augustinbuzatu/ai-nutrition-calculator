import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./routes";

describe("getAuthRedirect", () => {
  it.each(["/", "/log"])(
    "sends visitors who are not signed in from %s to /login",
    (pathname) => {
      expect(getAuthRedirect(pathname, false)).toBe("/login");
    },
  );

  it.each(["/login", "/signup", "/auth/confirm"])(
    "lets visitors who are not signed in open %s",
    (pathname) => {
      expect(getAuthRedirect(pathname, false)).toBeNull();
    },
  );

  it("does not make a page public just because its path starts with /login", () => {
    expect(getAuthRedirect("/login-history", false)).toBe("/login");
  });

  it.each(["/login", "/signup"])(
    "sends signed-in users from %s to the dashboard",
    (pathname) => {
      expect(getAuthRedirect(pathname, true)).toBe("/");
    },
  );

  it.each(["/", "/log", "/auth/confirm"])(
    "lets signed-in users open %s",
    (pathname) => {
      expect(getAuthRedirect(pathname, true)).toBeNull();
    },
  );
});
