import type { GetResourcesResult } from "@shopana/shared-kernel";

/**
 * Returns the list of resources and actions exposed by the media service.
 * Used by IAM service for resource discovery.
 */
export async function getResources(): Promise<GetResourcesResult> {
  return [{
    service: "media",
    displayName: "Media",
    scope: "store",
    resources: [
      {
        name: "file",
        displayName: "Files",
        description: "Media file management",
        actions: [
          { name: "upload", displayName: "Upload", description: "Upload new files" },
          { name: "read", displayName: "View", description: "View and download files" },
          { name: "update", displayName: "Edit", description: "Edit file metadata" },
          { name: "delete", displayName: "Delete", description: "Delete files" },
        ],
      },
      {
        name: "bucket",
        displayName: "Buckets",
        description: "Storage bucket management",
        actions: [
          { name: "create", displayName: "Create", description: "Create new buckets" },
          { name: "read", displayName: "View", description: "View bucket settings" },
          { name: "update", displayName: "Edit", description: "Edit bucket settings" },
          { name: "delete", displayName: "Delete", description: "Delete buckets" },
        ],
      },
    ],
  }];
}
