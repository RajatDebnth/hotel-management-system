import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEnvironment } from "./env";

describe("getPublicEnvironment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns complete public configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");

    expect(getPublicEnvironment()).toEqual({
      apiUrl: "http://localhost:8000",
    });
  });

  it("defaults to the local API when configuration is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(getPublicEnvironment()).toEqual({ apiUrl: "http://localhost:8000" });
  });
});
