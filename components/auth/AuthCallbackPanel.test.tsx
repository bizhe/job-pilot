import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthCallbackPanel } from "@/components/auth/AuthCallbackPanel";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { getInsforgePublicConfig } from "@/lib/insforge-config";

const replace = vi.fn();
const getCurrentUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
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
    },
  });
}

describe("AuthCallbackPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ data: { user: null }, error: null });
    mockConfiguredClient();
  });

  it("redirects to the dashboard when the SDK restores a user, covers: AC-2", async () => {
    getCurrentUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    render(<AuthCallbackPanel />);

    expect(screen.getByRole("heading", { name: /finishing sign in/i })).toBeVisible();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows a retry path when no restored user is available, covers: AC-2 AC-5", async () => {
    render(<AuthCallbackPanel />);

    expect(
      await screen.findByRole("heading", { name: /sign in needs another try/i }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows a safe retry path when auth is not configured, covers: AC-5", () => {
    vi.mocked(getInsforgePublicConfig).mockReturnValue(null);
    vi.mocked(getInsforgeBrowserClient).mockReturnValue(null);

    render(<AuthCallbackPanel />);

    expect(
      screen.getByRole("heading", { name: /sign in needs another try/i }),
    ).toBeVisible();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
