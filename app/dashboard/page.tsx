import { ProtectedPage } from "@/components/auth/ProtectedPage";

export default function DashboardPage() {
  return (
    <ProtectedPage
      title="Dashboard"
      description="Your dashboard is protected and ready for the next foundation slice."
    >
      <section className="rounded-xl border border-border bg-surface p-6 shadow-preview">
        <h2 className="text-base font-semibold text-text-primary">Auth is connected</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The full dashboard UI arrives in a later feature. This protected shell proves
          the session gate is working now.
        </p>
      </section>
    </ProtectedPage>
  );
}
