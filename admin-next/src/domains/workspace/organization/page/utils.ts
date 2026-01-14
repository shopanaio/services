import type { ApiUser, ApiRole } from "@/graphql/types";

/**
 * Get initials from a name string.
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get display name for a user (firstName lastName or email).
 */
export function getUserDisplayName(user: ApiUser): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email;
}

/**
 * Find a role by name in the roles array.
 */
export function getRoleByName(roles: ApiRole[], roleName: string): ApiRole | undefined {
  return roles.find((role) => role.name === roleName);
}
