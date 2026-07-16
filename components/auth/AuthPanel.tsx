"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getInsforgePublicConfig } from "@/lib/insforge-config";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";

type OAuthProvider = "google" | "github";

type ProviderOption = {
  provider: OAuthProvider;
  label: string;
  description: string;
};

const providerOptions: ProviderOption[] = [
  {
    provider: "google",
    label: "Continue with Google",
    description: "Use your Google account to start JobPilot.",
  },
  {
    provider: "github",
    label: "Continue with GitHub",
    description: "Use your GitHub account to start JobPilot.",
  },
];

function getSafeAuthError(errorCode: string | null): string | null {
  if (!errorCode) {
    return null;
  }

  return "Sign in did not complete. Please try again.";
}

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(
    getInsforgePublicConfig()
      ? getSafeAuthError(searchParams.get("error"))
      : "Auth is not configured yet. Add the InsForge public env vars.",
  );

  useEffect(() => {
    let isActive = true;
    const client = getInsforgeBrowserClient();

    if (!client) {
      return;
    }

    const activeClient = client;

    async function redirectExistingUser(): Promise<void> {
      try {
        const { data } = await activeClient.auth.getCurrentUser();

        if (isActive && data.user) {
          router.replace("/dashboard");
        }
      } catch (error: unknown) {
        console.error("[auth/login]", error);
      }
    }

    void redirectExistingUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleProviderClick(provider: OAuthProvider): Promise<void> {
    const client = getInsforgeBrowserClient();

    if (!client) {
      setMessage("Auth is not configured yet. Add the InsForge public env vars.");
      return;
    }

    setMessage(null);
    setPendingProvider(provider);

    try {
      const { error } = await client.auth.signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/callback`,
      });

      if (error) {
        console.error("[auth/oauth]", error);
        setMessage("We could not start sign in. Please try again.");
        setPendingProvider(null);
      }
    } catch (error: unknown) {
      console.error("[auth/oauth]", error);
      setMessage("We could not start sign in. Please try again.");
      setPendingProvider(null);
    }
  }

  return (
    <section
      aria-labelledby="login-title"
      className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Welcome to JobPilot
        </p>
        <h1
          id="login-title"
          className="mt-4 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl"
        >
          Sign in to continue
        </h1>
        <p className="mt-4 text-sm leading-6 text-text-secondary">
          Connect your account, then JobPilot will take you straight to your
          dashboard.
        </p>
      </div>

      <div className="mt-8 grid gap-3">
        {providerOptions.map((option) => {
          const isPending = pendingProvider === option.provider;
          const isDisabled = pendingProvider !== null;

          return (
            <button
              key={option.provider}
              type="button"
              className="group flex min-h-16 w-full items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isDisabled}
              onClick={() => {
                void handleProviderClick(option.provider);
              }}
            >
              <span>
                <span className="block text-sm font-semibold text-text-primary">
                  {isPending ? "Connecting..." : option.label}
                </span>
                <span className="mt-1 block text-xs text-text-secondary">
                  {option.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-secondary text-sm font-semibold uppercase text-text-dark transition-colors group-hover:border-accent group-hover:text-accent"
              >
                {option.provider.slice(0, 1)}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-6">
        {message ? (
          <p className="rounded-md border border-error bg-surface-secondary px-3 py-2 text-sm text-error">
            {message}
          </p>
        ) : (
          <p className="text-center text-xs text-text-muted">
            By continuing, you agree to use JobPilot for your own job search.
          </p>
        )}
      </div>
    </section>
  );
}
