import { ProtectedPage } from "@/components/auth/ProtectedPage";

export default function ProfilePage() {
  return (
    <ProtectedPage
      title="Profile"
      description="Your profile page is protected and waiting for the profile UI feature."
    >
      <section className="rounded-xl border border-border bg-surface p-6 shadow-preview">
        <h2 className="text-base font-semibold text-text-primary">Profile access is private</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Profile fields and resume upload are intentionally deferred to the profile
          phase in the build plan.
        </p>
      </section>
    </ProtectedPage>
  );
}
