"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import logo from "@/public/logo.png";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { getInsforgePublicConfig } from "@/lib/insforge-config";
import { capturePostHogEvent, capturePostHogException, identifyPostHogUser } from "@/lib/posthog-client";
import {
  addListValue,
  applyExtractedProfile,
  EMPTY_PROFILE_FORM,
  EMPTY_WORK_EXPERIENCE_ITEM,
  extractProfileFromResume,
  loadProfileForUser,
  normalizeProfileForSave,
  parseListInput,
  removeListValue,
  saveProfileForUser,
  uploadResumeForUser,
  validateResumeFile,
  type Education,
  type ExperienceLevel,
  type ProfileFormState,
  type RemotePreference,
  type WorkAuthorization,
  type WorkExperienceItem,
} from "@/lib/profile";

type AuthState = "checking" | "authenticated" | "blocked";
type ProfileStatus = "loading" | "ready" | "saving" | "uploading" | "extracting" | "error";
type ListField = "skills" | "industries" | "jobTitlesSeeking" | "preferredLocations";
type TextFieldName =
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "linkedinUrl"
  | "portfolioUrl"
  | "currentTitle"
  | "yearsExperience"
  | "salaryExpectation";

function toWorkAuthorization(value: string): WorkAuthorization {
  if (value === "citizen" || value === "permanent_resident" || value === "visa_required") {
    return value;
  }

  return "";
}

function toExperienceLevel(value: string): ExperienceLevel {
  if (value === "junior" || value === "mid" || value === "senior" || value === "lead") {
    return value;
  }

  return "";
}

function toRemotePreference(value: string): RemotePreference {
  if (value === "remote" || value === "onsite" || value === "hybrid" || value === "any") {
    return value;
  }

  return "";
}

function toHighestDegree(value: string): Education["highestDegree"] {
  if (value === "high_school" || value === "bachelors" || value === "masters") {
    return value;
  }

  return "";
}

function DashboardIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 17C5.5 14.2 7.2 12.8 10 12.8C12.8 12.8 14.5 14.2 15 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="size-7 text-accent" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M14 18V9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10 13L14 9L18 13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19.5H7.8C5.7 19.5 4 17.8 4 15.7C4 13.8 5.4 12.2 7.2 12C7.9 9.1 10.5 7 13.6 7C17.2 7 20.2 9.9 20.3 13.5H20.7C22.5 13.5 24 15 24 16.8C24 18.6 22.5 20.1 20.7 20.1H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="size-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 3.5H11.5L15 7V16.5H5V3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M11.5 3.5V7H15" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5 10H12.5M7.5 13H12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-text-primary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 3.5V6.5M13 3.5V6.5M4 8H16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-text-secondary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 7.5L10 12L14.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompletionIcon({ isComplete }: { isComplete: boolean }) {
  if (isComplete) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-success text-success" aria-label="Profile complete">
        <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 8.2L6.6 11.2L12.8 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex size-8 items-center justify-center rounded-full border-2 border-error text-sm font-bold text-error" aria-label="Profile needs attention">
      !
    </span>
  );
}

function CompletionRing({ percent, isComplete }: { percent: number; isComplete: boolean }) {
  const boundedPercent = Math.min(100, Math.max(0, percent));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (boundedPercent / 100) * circumference;
  const progressClass = isComplete ? "text-success" : "text-error";
  const trackClass = isComplete ? "text-success-light" : "text-error/10";

  return (
    <div className="relative mx-auto grid size-36 place-items-center lg:size-40" aria-label={`Profile completion ${boundedPercent} percent`}>
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
        <circle className={trackClass} cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="18" />
        <circle
          className={progressClass}
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="relative grid size-28 place-items-center rounded-full bg-surface lg:size-32">
        <span className="text-3xl font-bold text-text-primary sm:text-4xl">{boundedPercent}%</span>
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-16 w-full max-w-[2560px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="JobPilot home" className="focus-ring rounded-md">
          <Image src={logo} alt="JobPilot" className="h-10 w-auto" priority />
        </Link>
        <nav aria-label="Primary" className="flex min-h-16 items-center gap-3 sm:gap-8">
          <Link className="flex min-h-16 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-semibold text-text-secondary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-base" href="/dashboard">
            <DashboardIcon />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link className="flex min-h-16 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-semibold text-text-secondary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-base" href="/find-jobs">
            <SearchIcon />
            <span className="hidden sm:inline">Find Jobs</span>
          </Link>
          <Link className="flex min-h-16 items-center gap-2 border-b-2 border-accent px-1 text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-base" href="/profile" aria-current="page">
            <ProfileIcon />
            <span className="hidden sm:inline">Profile</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function AuthStatus({ authState }: { authState: AuthState }) {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center py-12">
      <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 text-center shadow-preview">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Checking access
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-text-primary">
          {authState === "checking" ? "Opening your workspace" : "Redirecting to login"}
        </h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          {authState === "checking"
            ? "We are confirming your session before showing this page."
            : "Please sign in to continue."}
        </p>
      </section>
    </main>
  );
}

function PageStatus({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 text-center shadow-preview sm:p-8" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        Profile
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-text-primary">{message}</h1>
    </section>
  );
}

function AttentionCard({ profile }: { profile: ProfileFormState }) {
  const missingFields = profile.missingFields.length > 0 ? profile.missingFields : ["ALL SET"];
  const tone = profile.isComplete
    ? {
      card: "border-success/20",
      chip: "bg-success-lightest text-success-dark",
    }
    : {
      card: "border-error/20",
      chip: "bg-error/5 text-error",
    };

  return (
    <section className={`grid gap-8 rounded-xl border bg-surface p-6 shadow-preview sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center ${tone.card}`}>
      <div>
        <div className="flex items-center gap-3">
          <CompletionIcon isComplete={profile.isComplete} />
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {profile.isComplete ? "Profile ready" : "Profile needs attention"}
          </h1>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-7 text-text-dark">
          {profile.isComplete
            ? "Your profile has the core details JobPilot needs for matching."
            : "Complete the missing fields to improve your chance of getting tailored matches and generating quality resumes."}
        </p>
        <ul className="mt-5 flex flex-wrap gap-3" aria-label="Missing fields">
          {missingFields.map((field) => (
            <li key={field} className={`rounded-sm px-3 py-1 text-sm font-bold tracking-wide ${tone.chip}`}>
              {field}
            </li>
          ))}
        </ul>
      </div>
      <CompletionRing percent={profile.completionPercentage} isComplete={profile.isComplete} />
    </section>
  );
}

function ProfileToast({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-md border border-success bg-success-lightest px-5 py-4 text-sm font-semibold text-success-dark shadow-preview" role="status" aria-live="polite">
      {message}
    </div>
  );
}

type ResumeCardProps = {
  profile: ProfileFormState;
  isUploading: boolean;
  isExtracting: boolean;
  canExtract: boolean;
  uploadMessage: string;
  onSelectResume: (file: File) => void;
  onExtractResume: () => void;
};

function ResumeCard({
  profile,
  isUploading,
  isExtracting,
  canExtract,
  uploadMessage,
  onSelectResume,
  onExtractResume,
}: ResumeCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isBusy = isUploading || isExtracting;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onSelectResume(file);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8">
      <h2 className="text-2xl font-bold tracking-tight text-text-primary">Resume</h2>
      <p className="mt-3 text-base leading-7 text-text-secondary">
        Upload an existing resume to auto-fill the profile, or generate a new tailored one from your details below.
      </p>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} aria-label="Select resume PDF" />
      <div className="mt-8 rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 py-12 text-center sm:py-16">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-border bg-surface shadow-preview">
          <UploadIcon />
        </div>
        <p className="mt-8 text-lg font-bold text-text-primary">
          {profile.resumePdfKey ? "Resume uploaded" : "Click to upload or drag and drop"}
        </p>
        <p className="mt-2 text-base font-medium text-text-muted">
          {profile.resumePdfKey ? "Your latest PDF is saved to your profile." : "PDF formatting only. Maximum file size 5MB."}
        </p>
        {uploadMessage ? (
          <p className="mt-4 text-sm font-semibold text-error" aria-live="polite">
            {uploadMessage}
          </p>
        ) : null}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-6 py-2 text-base font-bold text-text-dark shadow-preview transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? "Uploading..." : "Select Resume"}
        </button>
      </div>
      <div className="mt-8 grid gap-5 border-t border-border pt-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-secondary p-5">
          <p className="text-base font-bold text-text-primary">
            Fill the form from this PDF
          </p>
          <p className="text-sm leading-6 text-text-secondary">
            Extracted values replace the editable fields below. You still review and save manually.
          </p>
          <button
            type="button"
            disabled={!canExtract || isBusy}
            onClick={onExtractResume}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold text-accent-foreground shadow-preview transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileIcon />
            {isExtracting ? "Extracting..." : "Extract from Resume"}
          </button>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-secondary p-5">
          <p className="text-base font-bold text-text-primary">
            Need a fresh document?
          </p>
          <p className="text-sm leading-6 text-text-secondary">
            Generate a clean PDF from your saved profile in the next feature.
          </p>
          <button type="button" disabled className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-6 py-3 text-base font-bold text-accent-foreground shadow-preview opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <FileIcon />
            Generate Resume from Profile
          </button>
        </div>
      </div>
    </section>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function TextField({ id, label, value, placeholder, type = "text", disabled = false, onChange }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-14 w-full rounded-md border border-border bg-surface-secondary px-4 text-base font-medium text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:text-text-muted"
      />
    </div>
  );
}

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

function SelectField({ id, label, value, onChange, children }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </label>
      <div className="relative mt-3">
        <select
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-14 w-full appearance-none rounded-md border border-border bg-surface-secondary px-4 pr-12 text-base font-medium text-text-primary shadow-sm transition-colors focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          {children}
        </select>
        <ChevronIcon />
      </div>
    </div>
  );
}

type AddableFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
};

function AddableField({ id, label, placeholder, values, onAdd, onRemove }: AddableFieldProps) {
  const [nextValue, setNextValue] = useState("");

  function handleAdd(): void {
    onAdd(nextValue);
    setNextValue("");
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </label>
      <div className="mt-3 flex gap-3">
        <input
          id={id}
          name={id}
          value={nextValue}
          placeholder={placeholder}
          onChange={(event) => setNextValue(event.target.value)}
          className="min-h-14 min-w-0 flex-1 rounded-md border border-border bg-surface-secondary px-4 text-base font-medium text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
        <button type="button" onClick={handleAdd} className="min-h-14 rounded-md bg-surface-secondary px-6 text-base font-bold text-text-dark transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3" aria-label={`Current ${label.toLowerCase()}`}>
          {values.map((value) => (
            <li key={value} className="rounded-md border border-border bg-surface-secondary px-4 py-2 text-base font-bold text-text-primary">
              {value}
              <button
                type="button"
                onClick={() => onRemove(value)}
                className="ml-2 text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label={`Remove ${value}`}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-border" aria-hidden="true" />;
}

type WorkExperienceEditorProps = {
  items: WorkExperienceItem[];
  onChange: (items: WorkExperienceItem[]) => void;
};

function WorkExperienceEditor({ items, onChange }: WorkExperienceEditorProps) {
  function updateItem(index: number, nextItem: WorkExperienceItem): void {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)));
  }

  function addRole(): void {
    if (items.length < 3) {
      onChange([...items, { ...EMPTY_WORK_EXPERIENCE_ITEM }]);
    }
  }

  return (
    <fieldset className="space-y-6">
      <legend className="sr-only">Work Experience</legend>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-text-primary">Work Experience</h3>
        <button type="button" onClick={addRole} disabled={items.length >= 3} className="min-h-11 rounded-md px-3 text-base font-bold text-accent transition-colors hover:bg-accent-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60">
          + Add role
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`work-${index}`} className="rounded-xl border border-border bg-surface-secondary p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <TextField id={`company-name-${index}`} label="Company Name" value={item.companyName} onChange={(value) => updateItem(index, { ...item, companyName: value })} />
            <TextField id={`job-title-${index}`} label="Job Title" value={item.jobTitle} onChange={(value) => updateItem(index, { ...item, jobTitle: value })} />
            <div>
              <label htmlFor={`start-date-${index}`} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
                Start Date
              </label>
              <div className="relative mt-3">
                <input id={`start-date-${index}`} name={`start-date-${index}`} value={item.startDate} onChange={(event) => updateItem(index, { ...item, startDate: event.target.value })} className="min-h-14 w-full rounded-md border border-border bg-surface px-4 pr-12 text-base font-medium text-text-primary shadow-sm transition-colors focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent" />
                <CalendarIcon />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={`end-date-${index}`} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
                  End Date
                </label>
                <label htmlFor={`current-role-${index}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                  <input id={`current-role-${index}`} name={`current-role-${index}`} type="checkbox" checked={item.currentRole} onChange={(event) => updateItem(index, { ...item, currentRole: event.target.checked })} className="size-5 rounded border-border accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
                  Currently working here
                </label>
              </div>
              <input id={`end-date-${index}`} name={`end-date-${index}`} value={item.endDate} disabled={item.currentRole} placeholder="--------- ----" onChange={(event) => updateItem(index, { ...item, endDate: event.target.value })} className="mt-3 min-h-14 w-full rounded-md border border-border bg-surface-secondary px-4 text-base font-medium text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:text-text-muted" />
            </div>
          </div>
          <div className="mt-6">
            <label htmlFor={`key-responsibilities-${index}`} className="block text-sm font-bold uppercase tracking-wide text-text-secondary">
              Key Responsibilities
            </label>
            <textarea id={`key-responsibilities-${index}`} name={`key-responsibilities-${index}`} value={item.keyResponsibilities} onChange={(event) => updateItem(index, { ...item, keyResponsibilities: event.target.value })} rows={4} className="mt-3 w-full resize-y rounded-md border border-border bg-surface px-4 py-4 text-base font-medium leading-7 text-text-primary shadow-sm transition-colors focus:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent" />
          </div>
        </div>
      ))}
    </fieldset>
  );
}

type ProfileInformationProps = {
  profile: ProfileFormState;
  status: ProfileStatus;
  message: string;
  onProfileChange: (profile: ProfileFormState) => void;
  onSave: () => void;
};

function ProfileInformation({ profile, status, message, onProfileChange, onSave }: ProfileInformationProps) {
  const isSaving = status === "saving";

  function setTextField(field: TextFieldName, value: string): void {
    onProfileChange({ ...profile, [field]: value });
  }

  function setEducation(nextEducation: Education): void {
    onProfileChange({ ...profile, education: nextEducation });
  }

  function setList(field: ListField, values: string[]): void {
    onProfileChange({ ...profile, [field]: values });
  }

  function addToList(field: ListField, value: string): void {
    const parsed = parseListInput(value);
    const nextValues = parsed.reduce<string[]>((result, item) => addListValue(result, item), profile[field]);
    setList(field, nextValues);
  }

  function removeFromList(field: ListField, value: string): void {
    setList(field, removeListValue(profile[field], value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave();
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-preview sm:p-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Profile Information</h2>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          This context is used to accurately represent you in agent interactions.
        </p>
      </div>
      {message ? (
        <p className="mt-6 rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-semibold text-text-dark" aria-live="polite">
          {message}
        </p>
      ) : null}
      <div className="mt-8">
        <SectionDivider />
      </div>
      <form className="mt-10 space-y-14" onSubmit={handleSubmit}>
        <fieldset className="space-y-6">
          <legend className="text-xl font-bold text-text-primary">Personal Info</legend>
          <div className="grid gap-6 lg:grid-cols-2">
            <TextField id="full-name" label="Full Name" value={profile.fullName} onChange={(value) => setTextField("fullName", value)} />
            <TextField id="email" label="Email" value={profile.email} disabled onChange={() => undefined} />
            <TextField id="phone-number" label="Phone Number" value={profile.phone} placeholder="+1 (555) 000-0000" type="tel" onChange={(value) => setTextField("phone", value)} />
            <TextField id="location" label="Location" value={profile.location} placeholder="City, Country" onChange={(value) => setTextField("location", value)} />
            <TextField id="linkedin-url" label="LinkedIn URL" value={profile.linkedinUrl} type="url" onChange={(value) => setTextField("linkedinUrl", value)} />
            <TextField id="portfolio-github" label="Portfolio / GitHub" value={profile.portfolioUrl} type="url" onChange={(value) => setTextField("portfolioUrl", value)} />
            <SelectField id="work-authorization" label="Work Authorization" value={profile.workAuthorization} onChange={(value) => onProfileChange({ ...profile, workAuthorization: toWorkAuthorization(value) })}>
              <option value="">Select authorization</option>
              <option value="citizen">Citizen</option>
              <option value="permanent_resident">Permanent resident</option>
              <option value="visa_required">Visa required</option>
            </SelectField>
          </div>
        </fieldset>

        <SectionDivider />

        <fieldset className="space-y-6">
          <legend className="text-xl font-bold text-text-primary">Professional Info</legend>
          <TextField id="current-title" label="Current/Recent Job Title" value={profile.currentTitle} onChange={(value) => setTextField("currentTitle", value)} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SelectField id="experience-level" label="Experience Level" value={profile.experienceLevel} onChange={(value) => onProfileChange({ ...profile, experienceLevel: toExperienceLevel(value) })}>
              <option value="">Select level</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </SelectField>
            <TextField id="years-experience" label="Years of Experience" value={profile.yearsExperience} type="number" onChange={(value) => setTextField("yearsExperience", value)} />
          </div>
          <AddableField id="skills" label="Skills" placeholder="Add a skill" values={profile.skills} onAdd={(value) => addToList("skills", value)} onRemove={(value) => removeFromList("skills", value)} />
          <AddableField id="industries-worked" label="Industries Worked In (Optional)" placeholder="E.g. FinTech, Healthcare" values={profile.industries} onAdd={(value) => addToList("industries", value)} onRemove={(value) => removeFromList("industries", value)} />
        </fieldset>

        <SectionDivider />

        <WorkExperienceEditor items={profile.workExperience} onChange={(workExperience) => onProfileChange({ ...profile, workExperience })} />

        <SectionDivider />

        <fieldset className="space-y-6">
          <legend className="text-xl font-bold text-text-primary">Education</legend>
          <div className="grid gap-6 lg:grid-cols-2">
            <SelectField id="highest-degree" label="Highest Degree" value={profile.education.highestDegree} onChange={(value) => setEducation({ ...profile.education, highestDegree: toHighestDegree(value) })}>
              <option value="">Select degree</option>
              <option value="high_school">High School</option>
              <option value="bachelors">Bachelor&apos;s Degree</option>
              <option value="masters">Master&apos;s Degree</option>
            </SelectField>
            <TextField id="field-study" label="Field of Study" value={profile.education.fieldOfStudy} onChange={(value) => setEducation({ ...profile.education, fieldOfStudy: value })} />
            <TextField id="institution-name" label="Institution Name" value={profile.education.institutionName} placeholder="E.g. State University" onChange={(value) => setEducation({ ...profile.education, institutionName: value })} />
            <TextField id="graduation-year" label="Graduation Year" value={profile.education.graduationYear} placeholder="YYYY" onChange={(value) => setEducation({ ...profile.education, graduationYear: value })} />
          </div>
        </fieldset>

        <SectionDivider />

        <fieldset className="space-y-6">
          <legend className="text-xl font-bold text-text-primary">Job Preferences</legend>
          <AddableField id="job-titles-seeking" label="Job Titles Seeking" placeholder="E.g. Frontend Engineer" values={profile.jobTitlesSeeking} onAdd={(value) => addToList("jobTitlesSeeking", value)} onRemove={(value) => removeFromList("jobTitlesSeeking", value)} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SelectField id="remote-preference" label="Remote Preference" value={profile.remotePreference} onChange={(value) => onProfileChange({ ...profile, remotePreference: toRemotePreference(value) })}>
              <option value="">Select preference</option>
              <option value="any">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </SelectField>
            <TextField id="salary-expectation" label="Salary Expectation (Optional)" value={profile.salaryExpectation} placeholder="E.g. $120k+" onChange={(value) => setTextField("salaryExpectation", value)} />
          </div>
          <AddableField id="preferred-locations" label="Preferred Locations (Optional)" placeholder="E.g. New York, London" values={profile.preferredLocations} onAdd={(value) => addToList("preferredLocations", value)} onRemove={(value) => removeFromList("preferredLocations", value)} />
        </fieldset>

        <SectionDivider />

        <button type="submit" disabled={isSaving} className="min-h-14 w-full rounded-lg bg-accent px-6 py-4 text-base font-bold text-accent-foreground shadow-preview transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70">
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}

export function ProfilePageContent() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>(
    getInsforgePublicConfig() ? "checking" : "blocked",
  );
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");
  const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);

  useEffect(() => {
    let isActive = true;
    const client = getInsforgeBrowserClient();

    if (!client) {
      router.replace("/login?error=missing_config");
      return;
    }

    const activeClient = client;

    async function confirmSessionAndLoadProfile(): Promise<void> {
      try {
        const { data, error } = await activeClient.auth.getCurrentUser();

        if (!isActive) {
          return;
        }

        if (error || !data.user) {
          if (error) {
            console.error("[auth/profile]", error);
            capturePostHogException(error);
          }

          setAuthState("blocked");
          router.replace("/login");
          return;
        }

        identifyPostHogUser(data.user.id);
        setUserId(data.user.id);
        setAuthState("authenticated");
        setProfileStatus("loading");

        const loadResult = await loadProfileForUser(activeClient, data.user.id, data.user.email);

        if (!isActive) {
          return;
        }

        if (!loadResult.success || !loadResult.profile) {
          setProfileStatus("error");
          setMessage(loadResult.error ?? "We could not load your profile. Please try again.");
          return;
        }

        setProfile(loadResult.profile);
        setProfileStatus("ready");
        setMessage(loadResult.created ? "Your profile is ready to fill in." : "");
      } catch (error: unknown) {
        console.error("[auth/profile]", error);
        capturePostHogException(error);

        if (isActive) {
          setProfileStatus("error");
          setMessage("We could not load your profile. Please try again.");
        }
      }
    }

    void confirmSessionAndLoadProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastMessage]);

  async function handleSaveProfile(): Promise<void> {
    const client = getInsforgeBrowserClient();

    if (!client || !userId) {
      setMessage("Please sign in again before saving your profile.");
      return;
    }

    const wasComplete = profile.isComplete;
    const normalized = normalizeProfileForSave(profile);
    setProfileStatus("saving");
    setMessage("");

    const result = await saveProfileForUser(client, userId, normalized);

    if (!result.success || !result.profile) {
      setProfileStatus("ready");
      setMessage(result.error ?? "We could not save your profile. Please try again.");
      return;
    }

    setProfile(result.profile);
    setProfileStatus("ready");
    setToastMessage("Profile is saved.");

    if (!wasComplete && result.profile.isComplete) {
      capturePostHogEvent("profile_completed", { userId });
    }
  }

  async function handleSelectResume(file: File): Promise<void> {
    const client = getInsforgeBrowserClient();

    if (!client || !userId) {
      setUploadMessage("Please sign in again before uploading your resume.");
      return;
    }

    const validationError = validateResumeFile(file);

    if (validationError) {
      setSelectedResumeFile(null);
      setUploadMessage(validationError);
      return;
    }

    setSelectedResumeFile(file);
    setProfileStatus("uploading");
    setUploadMessage("");

    const result = await uploadResumeForUser(client, userId, file, profile);

    if (!result.success || !result.profile) {
      setProfileStatus("ready");
      setUploadMessage(result.error ?? "We could not upload your resume. Please try again.");
      return;
    }

    setProfile(result.profile);
    setProfileStatus("ready");
    setUploadMessage("Resume uploaded.");
  }

  async function handleExtractResume(): Promise<void> {
    if (!selectedResumeFile) {
      setUploadMessage("Please choose a PDF file before extracting.");
      return;
    }

    setProfileStatus("extracting");
    setUploadMessage("");
    setMessage("");

    const client = getInsforgeBrowserClient();
    const accessToken = await client?.getHttpClient().getValidAccessToken();
    const result = await extractProfileFromResume(selectedResumeFile, accessToken);

    if (!result.success || !result.profile) {
      setProfileStatus("ready");
      setUploadMessage(result.error ?? "We could not extract your resume. Please try again.");
      return;
    }

    const extractedProfile = result.profile;

    setProfile((currentProfile) => applyExtractedProfile(currentProfile, extractedProfile));
    setProfileStatus("ready");
    setMessage("Resume extracted. Review the fields below before saving.");
  }

  if (authState !== "authenticated") {
    return <AuthStatus authState={authState} />;
  }

  return (
    <>
      <AppHeader />
      <ProfileToast message={toastMessage} />
      <main className="mx-auto flex w-full max-w-[1640px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 xl:max-w-[1640px] xl:px-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          {profileStatus === "loading" ? (
            <PageStatus message="Loading your profile" />
          ) : null}
          {profileStatus === "error" ? (
            <PageStatus message={message || "We could not load your profile"} />
          ) : null}
          {profileStatus !== "loading" && profileStatus !== "error" ? (
            <>
              <AttentionCard profile={profile} />
              <ResumeCard
                profile={profile}
                isUploading={profileStatus === "uploading"}
                isExtracting={profileStatus === "extracting"}
                canExtract={selectedResumeFile !== null}
                uploadMessage={uploadMessage}
                onSelectResume={handleSelectResume}
                onExtractResume={handleExtractResume}
              />
              <ProfileInformation profile={profile} status={profileStatus} message={message} onProfileChange={setProfile} onSave={handleSaveProfile} />
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
