import { describe, expect, it } from "vitest";
import {
  describeAuthError,
  parseCredentials,
  signInSchema,
  signUpSchema,
} from "./credentials";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("parseCredentials", () => {
  it("trims spaces around the email, but never touches the password", () => {
    const result = parseCredentials(
      signUpSchema,
      form({ email: "  ana@example.com ", password: " secret pass " }),
    );
    expect(result).toEqual({
      ok: true,
      credentials: { email: "ana@example.com", password: " secret pass " },
    });
  });

  it("explains what is wrong with each field", () => {
    const result = parseCredentials(
      signUpSchema,
      form({ email: "ana@", password: "short" }),
    );
    expect(result).toEqual({
      ok: false,
      state: {
        fieldErrors: {
          email: ["Enter a valid email address."],
          password: ["Use at least 8 characters."],
        },
      },
    });
  });

  it("asks for both fields when the form sends neither", () => {
    const result = parseCredentials(signInSchema, new FormData());
    expect(result).toEqual({
      ok: false,
      state: {
        fieldErrors: {
          email: ["Enter your email."],
          password: ["Enter your password."],
        },
      },
    });
  });

  it("accepts any password at sign-in, so a stricter rule never locks out old accounts", () => {
    const result = parseCredentials(
      signInSchema,
      form({ email: "ana@example.com", password: "short" }),
    );
    expect(result.ok).toBe(true);
  });

  it.each([
    ["73 ASCII letters", "a".repeat(73)],
    ["37 letters of 2 bytes each", "ș".repeat(37)],
  ])("rejects new passwords over bcrypt's 72-byte limit: %s", (_, password) => {
    const result = parseCredentials(
      signUpSchema,
      form({ email: "ana@example.com", password }),
    );
    expect(result).toEqual({
      ok: false,
      state: { fieldErrors: { password: ["This password is too long."] } },
    });
  });

  it("accepts a new password of exactly 72 bytes", () => {
    const result = parseCredentials(
      signUpSchema,
      form({ email: "ana@example.com", password: "ș".repeat(36) }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("describeAuthError", () => {
  it("does not say whether the email or the password was wrong", () => {
    expect(describeAuthError("invalid_credentials")).toBe(
      "Wrong email or password.",
    );
  });

  it.each([undefined, "unexpected_failure", "some_future_code"])(
    "falls back to a generic message for %s",
    (code) => {
      expect(describeAuthError(code)).toBe(
        "Something went wrong. Please try again.",
      );
    },
  );
});
