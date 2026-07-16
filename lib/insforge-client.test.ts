import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn();

vi.mock("@insforge/sdk", () => ({
  createClient,
}));

async function loadClientModule(): Promise<typeof import("@/lib/insforge-client")> {
  vi.resetModules();
  return import("@/lib/insforge-client");
}

describe("getInsforgeBrowserClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_INSFORGE_URL;
    delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  });

  it("returns null and does not create a client when public auth config is missing, covers: AC-5", async () => {
    const { getInsforgeBrowserClient } = await loadClientModule();

    expect(getInsforgeBrowserClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates and reuses one configured browser client", async () => {
    const sdkClient = { auth: {} };
    createClient.mockReturnValue(sdkClient);
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "public-anon-key";
    const { getInsforgeBrowserClient } = await loadClientModule();

    expect(getInsforgeBrowserClient()).toBe(sdkClient);
    expect(getInsforgeBrowserClient()).toBe(sdkClient);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({
      baseUrl: "https://example.insforge.app",
      anonKey: "public-anon-key",
    });
  });
});
