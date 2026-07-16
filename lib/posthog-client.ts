import posthog from "posthog-js";

type JobSearchStartedProperties = {
  userId: string;
  jobTitle: string;
  location: string;
};

type JobFoundProperties = {
  userId: string;
  source: string;
  matchScore: number;
};

type ProfileCompletedProperties = {
  userId: string;
};

type CompanyResearchedProperties = {
  userId: string;
  jobId: string;
  company: string;
};

export type PostHogEventProperties = {
  job_search_started: JobSearchStartedProperties;
  job_found: JobFoundProperties;
  profile_completed: ProfileCompletedProperties;
  company_researched: CompanyResearchedProperties;
};

export type PostHogEventName = keyof PostHogEventProperties;

type PostHogPublicConfig = {
  key: string;
  host: string;
};

function getPostHogPublicConfig(): PostHogPublicConfig | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    return null;
  }

  return {
    key,
    host,
  };
}

export function initPostHog(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (posthog.__loaded) {
    return true;
  }

  const config = getPostHogPublicConfig();

  if (!config) {
    return false;
  }

  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false,
  });

  return true;
}

export function identifyPostHogUser(userId: string): void {
  if (!initPostHog()) {
    return;
  }

  posthog.identify(userId);
}

export function resetPostHogUser(): void {
  if (!initPostHog()) {
    return;
  }

  posthog.reset();
}

export function capturePostHogEvent<EventName extends PostHogEventName>(
  event: EventName,
  properties: PostHogEventProperties[EventName],
): void {
  if (!initPostHog()) {
    return;
  }

  posthog.capture(event, properties);
}

export function capturePostHogException(error: unknown): void {
  if (!initPostHog()) {
    return;
  }

  posthog.captureException(error);
}
