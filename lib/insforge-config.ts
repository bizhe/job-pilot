export type InsforgePublicConfig = {
  baseUrl: string;
  anonKey: string;
};

export function getInsforgePublicConfig(): InsforgePublicConfig | null {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    return null;
  }

  return {
    baseUrl,
    anonKey,
  };
}
