import type {
  ApiApiKey,
  ApiApiKeyCreateInput,
  ApiApiKeyDeleteInput,
  ApiApiKeyRevokeInput,
} from "@/graphql/types";

const MOCK_REQUEST_DELAY = 250;
let apiKeySequence = 2;

let apiKeys: ApiApiKey[] = [
  {
    id: "api-key-1",
    name: "Storefront integration",
    key: "",
    createdAt: "2026-06-15T10:00:00.000Z",
    createdById: "mock-user-id",
    dueDate: "2027-06-15T10:00:00.000Z",
    isBanned: false,
    lastUsedAt: "2026-07-14T15:30:00.000Z",
    revokedAt: null,
  },
  {
    id: "api-key-2",
    name: "Legacy importer",
    key: "",
    createdAt: "2026-05-01T08:00:00.000Z",
    createdById: "mock-user-id",
    dueDate: null,
    isBanned: true,
    lastUsedAt: "2026-06-20T12:10:00.000Z",
    revokedAt: "2026-07-01T09:00:00.000Z",
  },
];

const listeners = new Set<() => void>();

const publish = (nextApiKeys: ApiApiKey[]) => {
  apiKeys = nextApiKeys;
  listeners.forEach((listener) => listener());
};

const mockRequest = async <TData>(data: TData): Promise<TData> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY));
  return data;
};

export const subscribeToApiKeys = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getApiKeysSnapshot = () => apiKeys;

export const createMockApiKey = async (input: ApiApiKeyCreateInput) => {
  apiKeySequence += 1;
  const apiKey: ApiApiKey = {
    id: `api-key-${apiKeySequence}`,
    name: input.name,
    key: `sk_shopana_mock_${crypto.randomUUID().replaceAll("-", "")}`,
    createdAt: new Date().toISOString(),
    createdById: "mock-user-id",
    dueDate: input.dueDate ?? null,
    isBanned: false,
    lastUsedAt: null,
    revokedAt: null,
  };
  publish([...apiKeys, apiKey]);
  return mockRequest(apiKey);
};

export const revokeMockApiKey = async ({ id }: ApiApiKeyRevokeInput) => {
  publish(
    apiKeys.map((apiKey) =>
      apiKey.id === id
        ? {
            ...apiKey,
            isBanned: true,
            revokedAt: new Date().toISOString(),
          }
        : apiKey,
    ),
  );
  return mockRequest(true);
};

export const deleteMockApiKey = async ({ id }: ApiApiKeyDeleteInput) => {
  publish(apiKeys.filter((apiKey) => apiKey.id !== id));
  return mockRequest(id);
};
