import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedPage } from "@/components/auth/ProtectedPage";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { getInsforgePublicConfig } from "@/lib/insforge-config";

const replace = vi.fn();
const getCurrentUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock("@/lib/insforge-config", () => ({
  getInsforgePublicConfig: vi.fn(),
}));

vi.mock("@/lib/insforge-client", () => ({
  getInsforgeBrowserClient: vi.fn(),
}));

function renderProtectedPage(): void {
  render(
    <ProtectedPage title="Dashboard" description="Protected workspace">
      <section>
        <h2>Private dashboard content</h2>
      </section>
    </ProtectedPage>,
  );
}

function mockConfiguredClient(): void {
  vi.mocked(getInsforgePublicConfig).mockReturnValue({
    baseUrl: "https://example.insforge.app",
    anonKey: "public-anon-key",
  });
  vi.mocked(getInsforgeBrowserClient).mockReturnValue({
    auth: {
      getCurrentUser,
    },
  });
}

describe("ProtectedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ data: { user: null }, error: null });
    mockConfiguredClient();
  });

  it("shows private content only after a user session is confirmed, covers: AC-3", async () => {
    getCurrentUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    renderProtectedPage();

    expect(screen.getByRole("heading", { name: /opening your workspace/i })).toBeVisible();
    expect(screen.queryByText("Private dashboard content")).not.toBeInTheDocument();

    expect(await screen.findByText("Private dashboard content")).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated visitors to login before showing private content, covers: AC-3", async () => {
    renderProtectedPage();

    expect(screen.queryByText("Private dashboard content")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Private dashboard content")).not.toBeInTheDocument();
  });

  it("redirects to login with a safe missing config error, covers: AC-3 AC-5", async () => {
    vi.mocked(getInsforgePublicConfig).mockReturnValue(null);
    vi.mocked(getInsforgeBrowserClient).mockReturnValue(null);

    renderProtectedPage();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?error=missing_config");
    });
    expect(screen.getByRole("heading", { name: /redirecting to login/i })).toBeVisible();
    expect(screen.queryByText("Private dashboard content")).not.toBeInTheDocument();
  });
});
