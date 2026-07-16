import { PostHog } from "posthog-node";

import type { PostHogEventName, PostHogEventProperties } from "@/lib/posthog-client";

type PostHogServerConfig = {
  key: string;
  host: string;
};

function getPostHogServerConfig(): PostHogServerConfig | null {
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

export function createPostHogServer(): PostHog | null {
  const config = getPostHogServerConfig();

  if (!config) {
    return null;
  }

  return new PostHog(config.key, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
  });
}

export async function capturePostHogServerEvent<EventName extends PostHogEventName>(
  distinctId: string,
  event: EventName,
  properties: PostHogEventProperties[EventName],
): Promise<void> {
  const posthog = createPostHogServer();

  if (!posthog) {
    return;
  }

  try {
    posthog.capture({
      distinctId,
      event,
      properties,
    });
  } finally {
    await posthog.shutdown();
  }
}
