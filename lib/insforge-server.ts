import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

import { getInsforgePublicConfig } from "@/lib/insforge-config";

type CreateInsforgeServerOptions = {
  accessToken?: string;
};

export async function createInsforgeServer(options: CreateInsforgeServerOptions = {}) {
  const config = getInsforgePublicConfig();

  if (!config) {
    return null;
  }

  return createServerClient({
    ...config,
    accessToken: options.accessToken,
    cookies: await cookies(),
  });
}
