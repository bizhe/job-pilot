import Image from "next/image";
import Link from "next/link";

import dashboardDemo from "@/public/images/dashboard-demo.png";
import jobsList from "@/public/images/jobs-lists.png";
import agentLog from "@/public/images/agnet-log.png";
import userIcon from "@/public/images/user-icon.png";
import logo from "@/public/logo.png";

const firstFeatureItems = [
  {
    title: "Find jobs that actually fit",
    description:
      "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
  },
  {
    title: "Know the Company Before You Apply",
    description:
      "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    description:
      "Keep a clear view of every job you’ve found, tailored. Your activity and progress all stay in one simple place.",
  },
];

const secondFeatureItems = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what’s missing.",
  },
  {
    title: "AI-Powered Job Matching",
    description:
      "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

function Logo() {
  return (
    <Link href="/" aria-label="JobPilot home" className="focus-ring rounded-md">
      <Image src={logo} alt="JobPilot" className="h-7 w-auto" priority />
    </Link>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="page-shell flex min-h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <Link className="nav-link" href="/dashboard">
            Dashboard
          </Link>
          <Link className="nav-link" href="/find-jobs">
            Find Jobs
          </Link>
          <Link className="nav-link" href="/profile">
            Profile
          </Link>
        </nav>
        <Link className="button-primary" href="/login">
          Start for free
        </Link>
      </div>
    </header>
  );
}

function ActionLinks() {
  return (
    <div className="flex flex-col justify-center gap-3 sm:flex-row">
      <Link className="button-primary" href="/login">
        Get Started <span aria-hidden="true">›</span>
      </Link>
      <Link className="button-secondary" href="/find-jobs">
        Find Your First Match
      </Link>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-gradient border-x border-border px-6 py-16 text-center sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-text-black sm:text-5xl lg:text-6xl">
          Job hunting is hard.
          <br />
          Your tools shouldn’t be.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary">
          Stop applying blind. JobPilot finds the jobs, researches the companies, and
          gives you everything you need to stand out.
        </p>
        <div className="mt-7">
          <ActionLinks />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section aria-label="JobPilot dashboard preview" className="border-x border-t border-border bg-surface-tertiary px-5 py-10 sm:px-12 sm:py-14 lg:px-16">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-preview">
        <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-4">
          <span className="size-2 rounded-full bg-surface-muted" />
          <span className="size-2 rounded-full bg-surface-muted" />
          <span className="size-2 rounded-full bg-surface-muted" />
          <div className="mx-auto flex h-6 w-2/5 items-center justify-center rounded-md bg-surface-secondary text-xs text-text-muted">
            jobpilot.ai/dashboard
          </div>
        </div>
        <Image
          src={dashboardDemo}
          alt="JobPilot dashboard showing job search statistics, recent activity, and company research analytics"
          className="h-auto w-full"
          priority
        />
      </div>
    </section>
  );
}

type FeatureListProps = {
  items: typeof firstFeatureItems;
};

function FeatureList({ items }: FeatureListProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item, index) => (
        <li
          key={item.title}
          className={`feature-copy ${index === 0 ? "feature-copy-active" : ""}`}
        >
          <h3 className="text-base font-semibold text-text-dark">{item.title}</h3>
          <p className="mt-2 text-base leading-7 text-text-secondary">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

function FeatureSections() {
  return (
    <section aria-labelledby="features-title" className="border-x border-t border-border bg-surface">
      <div className="section-divider" />
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col border-b border-border lg:border-r">
          <div className="feature-heading">
            <h2 id="features-title" className="text-3xl font-semibold tracking-tight text-text-primary lg:text-4xl">
              Manage Your Job
              <br />
              Search With Ease
            </h2>
          </div>
          <FeatureList items={firstFeatureItems} />
        </div>
        <div className="flex items-center justify-center bg-surface-muted p-8 sm:p-12 lg:p-16">
          <Image
            src={jobsList}
            alt="JobPilot jobs list with companies, match scores, salary estimates, and sources"
            className="h-auto w-full rounded-lg"
          />
        </div>
      </div>

      <div className="section-divider" />
      <div className="grid lg:grid-cols-2">
        <div className="order-2 flex items-center justify-center bg-surface-muted p-8 sm:p-12 lg:order-1 lg:p-16">
          <Image
            src={agentLog}
            alt="JobPilot agent log finding matching roles and preparing an application"
            className="h-auto w-full rounded-lg"
          />
        </div>
        <div className="order-1 flex flex-col border-b border-border lg:order-2 lg:border-l">
          <div className="feature-heading">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary lg:text-4xl">
              Apply With More
              <br />
              Confidence, Every Time
            </h2>
          </div>
          <FeatureList items={secondFeatureItems} />
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section aria-labelledby="testimonial-title" className="border-x border-t border-border bg-surface text-center">
      <div className="section-divider" />
      <div className="px-6 py-16 sm:py-20 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Success Stories</p>
        <h2 id="testimonial-title" className="mx-auto mt-6 max-w-4xl text-2xl font-medium leading-snug text-text-dark sm:text-3xl">
          “I used to spend my evenings copy-pasting resumes. Now I open my dashboard
          to see interviews waiting. It feels like cheating. Had 3 offers on the table
          simultaneously.”
        </h2>
        <div className="mt-7 flex items-center justify-center gap-3 text-left">
          <Image src={userIcon} alt="Tom Wilson" className="size-10 rounded-md" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Tom Wilson</p>
            <p className="text-xs text-text-secondary">Junior Developer</p>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  );
}

function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="hero-gradient border-x border-t border-border px-6 py-16 text-center sm:py-20">
      <h2 id="cta-title" className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-text-black sm:text-5xl">
        Your next job search can feel a
        <br className="hidden sm:block" /> lot less overwhelming
      </h2>
      <p className="mx-auto mt-6 max-w-2xl text-base text-text-secondary">
        Set up your profile, upload your resume, and start finding matches in minutes.
      </p>
      <div className="mt-7">
        <ActionLinks />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-x border-t border-border bg-surface">
      <div className="section-divider" />
      <div className="flex flex-col items-center justify-between gap-8 px-8 py-10 sm:flex-row sm:px-10">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link className="footer-link" href="/dashboard">Dashboard</Link>
          <Link className="footer-link" href="/privacy">Privacy Policy</Link>
          <Link className="footer-link" href="/terms">Terms &amp; Condition</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Header />
      <main id="main-content" className="page-shell">
        <Hero />
        <DashboardPreview />
        <FeatureSections />
        <Testimonial />
        <ClosingCta />
      </main>
      <div className="page-shell">
        <Footer />
      </div>
    </div>
  );
}
