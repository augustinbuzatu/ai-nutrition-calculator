// @ts-check
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  committedEnvProblems,
  hasAiKey,
  meetsNode,
  parseEnv,
  projectRefFrom,
  supabaseSettingsProblem,
  withEnvValue,
} from "./setup.mjs";

const REF = "abcdefghijklmnopqrst";

describe("meetsNode", () => {
  it("compares the major version", () => {
    expect(meetsNode("22.11.0", 22)).toBe(true);
    expect(meetsNode("v24.1.0", 22)).toBe(true);
    expect(meetsNode("20.18.1", 22)).toBe(false);
    expect(meetsNode("", 22)).toBe(false);
  });
});

describe("parseEnv", () => {
  it("reads variables, without comments, blank lines or quotes", () => {
    expect(
      parseEnv(
        '# A comment\n\nNEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\r\nAPP_ANTHROPIC_API_KEY="sk-ant-1"\nEMPTY=\n',
      ),
    ).toEqual(
      new Map([
        ["NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co"],
        ["APP_ANTHROPIC_API_KEY", "sk-ant-1"],
        ["EMPTY", ""],
      ]),
    );
  });
});

describe("withEnvValue", () => {
  it("replaces an existing line, keeping the comments around it", () => {
    expect(
      withEnvValue(
        "# The key\nAPP_ANTHROPIC_API_KEY=\n# After\n",
        "APP_ANTHROPIC_API_KEY",
        "sk-ant-1",
      ),
    ).toBe("# The key\nAPP_ANTHROPIC_API_KEY=sk-ant-1\n# After\n");
  });

  it("adds a line at the end when the variable is not there", () => {
    expect(withEnvValue("", "A", "1")).toBe("A=1\n");
    expect(withEnvValue("B=2", "A", "1")).toBe("B=2\nA=1\n");
    expect(withEnvValue("B=2\n", "A", "1")).toBe("B=2\nA=1\n");
  });
});

describe("supabaseSettingsProblem", () => {
  const url = `https://${REF}.supabase.co`;

  it("accepts a project's URL and publishable key, or a local Supabase", () => {
    expect(
      supabaseSettingsProblem({ url, publishableKey: "sb_publishable_x" }),
    ).toBeNull();
    expect(
      supabaseSettingsProblem({
        url: "http://127.0.0.1:54321",
        publishableKey: "sb_publishable_x",
      }),
    ).toBeNull();
  });

  it("reports missing settings", () => {
    expect(supabaseSettingsProblem({})).toBe("missing");
    expect(supabaseSettingsProblem({ url, publishableKey: "" })).toBe(
      "missing",
    );
  });

  it("refuses the secret key and anything that is not a project URL", () => {
    expect(
      supabaseSettingsProblem({ url, publishableKey: "sb_secret_x" }),
    ).toMatch(/secret key/);
    expect(
      supabaseSettingsProblem({ url, publishableKey: "eyJhbGciOi" }),
    ).toMatch(/sb_publishable_/);
    expect(
      supabaseSettingsProblem({
        url: "https://evil.example",
        publishableKey: "sb_publishable_x",
      }),
    ).toMatch(/supabase\.co/);
  });
});

describe("projectRefFrom", () => {
  it("reads the ref from a project URL only", () => {
    expect(projectRefFrom(`https://${REF}.supabase.co`)).toBe(REF);
    expect(projectRefFrom(`https://${REF}.supabase.co/`)).toBe(REF);
    expect(projectRefFrom("http://127.0.0.1:54321")).toBeNull();
    expect(
      projectRefFrom(`https://${REF}.supabase.co.evil.example`),
    ).toBeNull();
  });
});

describe("committedEnvProblems", () => {
  it("allows the public Supabase settings", () => {
    expect(
      committedEnvProblems(
        `NEXT_PUBLIC_SUPABASE_URL=https://${REF}.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_x\n`,
      ),
    ).toEqual([]);
  });

  it("refuses secrets and any other variable", () => {
    expect(
      committedEnvProblems(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_secret_x\nAPP_ANTHROPIC_API_KEY=\n",
      ),
    ).toEqual([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret: it belongs in .env.local.",
      "APP_ANTHROPIC_API_KEY does not belong in .env: put it in .env.local.",
    ]);
    expect(
      committedEnvProblems("NEXT_PUBLIC_SUPABASE_URL=sk-ant-api03-x\n"),
    ).toHaveLength(1);
  });

  it("finds nothing to leak in the .env committed to this repository", () => {
    const committed = readFileSync(new URL("../.env", import.meta.url), "utf8");
    expect(committedEnvProblems(committed)).toEqual([]);
  });
});

describe("hasAiKey", () => {
  it("needs an Anthropic or an OpenAI key", () => {
    expect(hasAiKey(new Map())).toBe(false);
    expect(hasAiKey(new Map([["APP_ANTHROPIC_API_KEY", ""]]))).toBe(false);
    expect(hasAiKey(new Map([["APP_ANTHROPIC_API_KEY", "sk-ant-1"]]))).toBe(
      true,
    );
    expect(hasAiKey(new Map([["OPENAI_API_KEY", "sk-1"]]))).toBe(true);
  });
});
