import { afterEach, describe, expect, it } from "vitest";

import { getInsforgePublicConfig } from "@/lib/insforge-config";

const originalUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

function restoreEnv(): void {
  process.env.NEXT_PUBLIC_INSFORGE_URL = originalUrl;
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = originalAnonKey;
}

describe("getInsforgePublicConfig", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("returns null when either public auth value is missing, covers: AC-5", () => {
    delete process.env.NEXT_PUBLIC_INSFORGE_URL;
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "public-anon-key";

    expect(getInsforgePublicConfig()).toBeNull();

    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

    expect(getInsforgePublicConfig()).toBeNull();
  });

  it("returns the public config without exposing extra values", () => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "public-anon-key";

    expect(getInsforgePublicConfig()).toEqual({
      baseUrl: "https://example.insforge.app",
      anonKey: "public-anon-key",
    });
  });
});
