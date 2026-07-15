import type {
  ApiApp,
  ApiAppsMutationInstallArgs,
  ApiAppsMutationUninstallArgs,
  ApiInstalledApp,
} from "@/graphql/types";

const MOCK_REQUEST_DELAY = 250;
let installedSequence = 1;

let snapshot: { apps: ApiApp[]; installedApps: ApiInstalledApp[] } = {
  apps: [
    {
      code: "nova-poshta",
      name: "Nova Poshta",
      meta: { logoUrl: null },
    },
    {
      code: "stripe",
      name: "Stripe",
      meta: { logoUrl: null },
    },
    {
      code: "meest",
      name: "Meest",
      meta: { logoUrl: null },
    },
    {
      code: "google-merchant",
      name: "Google Merchant Center",
      meta: { logoUrl: null },
    },
    {
      code: "mailchimp",
      name: "Mailchimp",
      meta: { logoUrl: null },
    },
    {
      code: "telegram",
      name: "Telegram",
      meta: { logoUrl: null },
    },
  ],
  installedApps: [
    {
      id: "installed-app-1",
      appCode: "nova-poshta",
      baseURL: "https://api.novaposhta.ua",
      domain: "mock-store",
      enabled: true,
      meta: {},
      storeID: "mock-store-id",
    },
  ],
};

const listeners = new Set<() => void>();

const publish = (nextSnapshot: typeof snapshot) => {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
};

const mockRequest = async <TData>(data: TData): Promise<TData> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY));
  return data;
};

export const subscribeToApps = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getAppsSnapshot = () => snapshot;

export const installMockApp = async ({ code }: ApiAppsMutationInstallArgs) => {
  installedSequence += 1;
  const installedApp: ApiInstalledApp = {
    id: `installed-app-${installedSequence}`,
    appCode: code,
    baseURL: "",
    domain: "mock-store",
    enabled: true,
    meta: {},
    storeID: "mock-store-id",
  };
  publish({
    ...snapshot,
    installedApps: [...snapshot.installedApps, installedApp],
  });
  return mockRequest(true);
};

export const uninstallMockApp = async ({
  code,
}: ApiAppsMutationUninstallArgs) => {
  publish({
    ...snapshot,
    installedApps: snapshot.installedApps.filter(
      (installedApp) => installedApp.appCode !== code,
    ),
  });
  return mockRequest(true);
};
