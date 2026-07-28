interface AdminAppPathInput {
  orgName: string;
  storeName: string;
  appCode: string;
  appPath?: string;
}

export function createAdminAppPath({
  orgName,
  storeName,
  appCode,
  appPath = "",
}: AdminAppPathInput): string {
  const prefix = `/${encodeURIComponent(orgName)}/${encodeURIComponent(
    storeName,
  )}/apps/${encodeURIComponent(appCode)}`;
  const suffix = appPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return suffix ? `${prefix}/${suffix}` : prefix;
}
