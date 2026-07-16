"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getInsforgePublicConfig } from "@/lib/insforge-config";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";

type CallbackState = "loading" | "error";

export function AuthCallbackPanel() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>(
    getInsforgePublicConfig() ? "loading" : "error",
  );

  useEffect(() => {
    let isActive = true;
    const client = getInsforgeBrowserClient();

    if (!client) {
      return;
    }

    const activeClient = client;

    async function restoreSession(): Promise<void> {
      try {
        const { data, error } = await activeClient.auth.getCurrentUser();

        if (!isActive) {
          return;
        }

        if (error || !data.user) {
          if (error) {
            console.error("[auth/callback]", error);
          }

          setState("error");
          return;
        }

        router.replace("/dashboard");
      } catch (error: unknown) {
        console.error("[auth/callback]", error);

        if (isActive) {
          setState("error");
        }
      }
    }

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <section
      aria-labelledby="callback-title"
      className="w-full max-w-xl rounded-xl border border-border bg-surface p-6 text-center shadow-preview sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        Securing your session
      </p>
      <h1
        id="callback-title"
        className="mt-4 text-3xl font-semibold tracking-tight text-text-primary"
      >
        {state === "loading" ? "Finishing sign in" : "Sign in needs another try"}
      </h1>
      <p className="mt-4 text-sm leading-6 text-text-secondary" aria-live="polite">
        {state === "loading"
          ? "We are confirming your account and opening your dashboard."
          : "We could not confirm your session. Please return to login and try again."}
      </p>
      {state === "error" ? (
        <Link href="/login" className="button-primary mt-6">
          Back to login
        </Link>
      ) : null}
    </section>
  );
}
