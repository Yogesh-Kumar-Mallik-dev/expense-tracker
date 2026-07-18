import type { PowerSyncCredentials } from "@powersync/common";

export type CredentialsProvider = () => Promise<PowerSyncCredentials | null>;

export interface HttpCredentialsProviderOptions {
  endpoint: string;
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof globalThis.fetch;
}

export function createHttpCredentialsProvider(
  options: HttpCredentialsProviderOptions,
): CredentialsProvider {
  return async () => {
    const accessToken = await options.getAccessToken();
    if (!accessToken) return null;

    const response = await (options.fetch ?? globalThis.fetch)(options.endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Unable to fetch PowerSync credentials (${response.status})`);
    }

    const payload = (await response.json()) as {
      data?: {
        endpoint: string;
        token: string;
        expiresAt?: string;
      };
      endpoint: string;
      token: string;
      expiresAt?: string;
    };
    const value = payload.data ?? payload;

    return {
      endpoint: value.endpoint,
      token: value.token,
      ...(value.expiresAt ? { expiresAt: new Date(value.expiresAt) } : {}),
    };
  };
}
