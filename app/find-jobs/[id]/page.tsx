import { ProtectedPage } from "@/components/auth/ProtectedPage";

type JobDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  const { id } = await params;

  return (
    <ProtectedPage
      title="Job Details"
      description="Individual job details are protected and ready for the details feature."
    >
      <section className="rounded-xl border border-border bg-surface p-6 shadow-preview">
        <h2 className="text-base font-semibold text-text-primary">Protected job route</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Route id: <span className="font-medium text-text-primary">{id}</span>
        </p>
      </section>
    </ProtectedPage>
  );
}
