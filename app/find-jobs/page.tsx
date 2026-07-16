import { ProtectedPage } from "@/components/auth/ProtectedPage";

export default function FindJobsPage() {
  return (
    <ProtectedPage
      title="Find Jobs"
      description="Job search is protected and ready for the search UI feature."
    >
      <section className="rounded-xl border border-border bg-surface p-6 shadow-preview">
        <h2 className="text-base font-semibold text-text-primary">Search access is private</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          The full job search controls and results table will land in the planned Find
          Jobs page slice.
        </p>
      </section>
    </ProtectedPage>
  );
}
