import { Suspense } from "react";
import Link from "next/link";

import { AuthPanel } from "@/components/auth/AuthPanel";

export default function LoginPage() {
  return (
    <main className="page-shell relative flex min-h-screen items-center justify-center py-12">
      <Link href="/" className="nav-link absolute left-4 top-8 sm:left-6 lg:left-8">
        Back to home
      </Link>
      <div className="w-full max-w-xl">
        <Suspense
          fallback={
            <section className="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-preview">
              <p className="text-sm text-text-secondary">Loading sign in...</p>
            </section>
          }
        >
          <AuthPanel />
        </Suspense>
      </div>
    </main>
  );
}
