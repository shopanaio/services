import type { AdminAppUiDescriptor } from "../descriptor-schema";

export interface AdminAppNavigationContribution {
  owner: string;
  appCode: string;
  displayName: string;
  item: AdminAppUiDescriptor["navigation"][number];
}

class AdminAppNavigationRegistry {
  private contributions: AdminAppNavigationContribution[] = [];

  replace(contributions: readonly AdminAppNavigationContribution[]): void {
    this.contributions = [...contributions].sort(
      (left, right) =>
        left.item.order - right.item.order ||
        left.appCode.localeCompare(right.appCode) ||
        left.item.id.localeCompare(right.item.id),
    );
  }

  getAll(): AdminAppNavigationContribution[] {
    return [...this.contributions];
  }
}

export const adminAppNavigationRegistry = new AdminAppNavigationRegistry();
