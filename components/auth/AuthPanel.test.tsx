import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { getInsforgePublicConfig } from "@/lib/insforge-config";

const replace = vi.fn();
const searchParamGet = vi.fn();
const getCurrentUser = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
  useSearchParams: () => ({
    get: searchParamGet,
  }),
}));

vi.mock("@/lib/insforge-config", () => ({
  getInsforgePublicConfig: vi.fn(),
}));

vi.mock("@/lib/insforge-client", () => ({
  getInsforgeBrowserClient: vi.fn(),
}));

function mockConfiguredClient(): void {
  vi.mocked(getInsforgePublicConfig).mockReturnValue({
    baseUrl: "https://example.insforge.app",
    anonKey: "public-anon-key",
  });
  vi.mocked(getInsforgeBrowserClient).mockReturnValue({
    auth: {
      getCurrentUser,
      signInWithOAuth,
    },
  });
}

describe("AuthPanel", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    searchParamGet.mockReturnValue(null);
    getCurrentUser.mockResolvedValue({ data: { user: null }, error: null });
    signInWithOAuth.mockResolvedValue({ error: null });
    mockConfiguredClient();
  });

  it("renders the Google and GitHub OAuth buttons, covers: AC-1", () => {
    render(<AuthPanel />);

    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /continue with github/i }),
    ).toBeEnabled();
  });

  it("starts the selected provider with the callback redirect, covers: AC-1", async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    await user.click(screen.getByRole("button", { name: /continue with github/i }));

    expect(signInWithOAuth).toHaveBeenCalledWith("github", {
      redirectTo: "http://localhost:3000/callback",
    });
    expect(
      screen.getByRole("button", { name: /connecting/i }),
    ).toBeDisabled();
  });

  it("redirects an already signed in user to the dashboard, covers: AC-4", async () => {
    getCurrentUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    render(<AuthPanel />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows a safe message when OAuth cannot start, covers: AC-5", async () => {
    const user = userEvent.setup();
    signInWithOAuth.mockResolvedValue({
      error: new Error("secret provider token leaked"),
    });

    render(<AuthPanel />);

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(
      await screen.findByText("We could not start sign in. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret provider token leaked/i)).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        message: expect.stringMatching(/secret provider token leaked/i),
      }),
    );
  });

  it("shows a safe missing configuration message without calling OAuth, covers: AC-5", async () => {
    const user = userEvent.setup();
    vi.mocked(getInsforgePublicConfig).mockReturnValue(null);
    vi.mocked(getInsforgeBrowserClient).mockReturnValue(null);

    render(<AuthPanel />);

    expect(
      screen.getByText("Auth is not configured yet. Add the InsForge public env vars."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
