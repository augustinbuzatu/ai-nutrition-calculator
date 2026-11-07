import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCredentials, isDemoConfigured } from "./demo";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("demoCredentials", () => {
  it("reads the demo account from the server's environment", () => {
    vi.stubEnv("DEMO_EMAIL", " demo@example.com ");
    vi.stubEnv("DEMO_PASSWORD", "correct-horse");
    expect(demoCredentials()).toEqual({
      email: "demo@example.com",
      password: "correct-horse",
    });
    expect(isDemoConfigured()).toBe(true);
  });

  it("offers no demo unless both are set", () => {
    vi.stubEnv("DEMO_EMAIL", "demo@example.com");
    vi.stubEnv("DEMO_PASSWORD", "");
    expect(demoCredentials()).toBeNull();
    vi.stubEnv("DEMO_EMAIL", " ");
    vi.stubEnv("DEMO_PASSWORD", "correct-horse");
    expect(isDemoConfigured()).toBe(false);
  });
});
