import { createClient, type InsForgeClient } from "@insforge/sdk";

import { getInsforgePublicConfig } from "@/lib/insforge-config";

let browserClient: InsForgeClient | null = null;

export function getInsforgeBrowserClient(): InsForgeClient | null {
  if (browserClient) {
    return browserClient;
  }

  const config = getInsforgePublicConfig();

  if (!config) {
    return null;
  }

  browserClient = createClient(config);
  return browserClient;
}
