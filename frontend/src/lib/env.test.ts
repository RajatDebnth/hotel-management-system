import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEnvironment } from "./env";

describe("getPublicEnvironment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns complete public configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");

    expect(getPublicEnvironment()).toEqual({
      apiUrl: "http://localhost:8000",
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
    });
  });

  it("fails clearly when a value is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(() => getPublicEnvironment()).toThrow(
      "Missing required public environment variable: NEXT_PUBLIC_API_URL",
    );
  });
});

