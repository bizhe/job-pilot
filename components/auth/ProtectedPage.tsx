"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getInsforgePublicConfig } from "@/lib/insforge-config";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { capturePostHogException, identifyPostHogUser } from "@/lib/posthog-client";

type AuthState = "checking" | "authenticated" | "blocked";

type ProtectedPageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ProtectedPage({ title, description, children }: ProtectedPageProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>(
    getInsforgePublicConfig() ? "checking" : "blocked",
  );

  useEffect(() => {
    let isActive = true;
    const client = getInsforgeBrowserClient();

    if (!client) {
      router.replace("/login?error=missing_config");
      return;
    }

    const activeClient = client;

    async function confirmSession(): Promise<void> {
      try {
        const { data, error } = await activeClient.auth.getCurrentUser();

        if (!isActive) {
          return;
        }

        if (error || !data.user) {
          if (error) {
            console.error("[auth/protected]", error);
            capturePostHogException(error);
          }

          setAuthState("blocked");
          router.replace("/login");
          return;
        }

        identifyPostHogUser(data.user.id);
        setAuthState("authenticated");
      } catch (error: unknown) {
        console.error("[auth/protected]", error);
        capturePostHogException(error);

        if (isActive) {
          setAuthState("blocked");
          router.replace("/login");
        }
      }
    }

    void confirmSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  if (authState !== "authenticated") {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center py-12">
        <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 text-center shadow-preview">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Checking access
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-text-primary">
            {authState === "checking" ? "Opening your workspace" : "Redirecting to login"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {authState === "checking"
              ? "We are confirming your session before showing this page."
              : "Please sign in to continue."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell py-8">
      <section className="rounded-xl border border-border bg-surface p-6 shadow-preview">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          JobPilot
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
          {description}
        </p>
      </section>
      <div className="mt-6">{children}</div>
    </main>
  );
}
