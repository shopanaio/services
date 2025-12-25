/**
 * User - authenticated admin user in the system (CMS/back-office)
 */
export interface User {
  /** The globally unique ID of the user */
  id: string;

  /** User's email address */
  email: string;

  /** Whether the email has been verified */
  emailVerified: boolean | null;

  /** User's first name */
  firstName: string | null;

  /** User's last name */
  lastName: string | null;

  /** URL to user's avatar image */
  avatar: string | null;

  /** User's locale/language preference */
  locale: string | null;

  /** Whether the user has admin privileges */
  isAdmin: boolean | null;

  /** Whether the user account is forbidden/banned */
  isForbidden: boolean | null;

  /** Whether the user account is deleted */
  isDeleted: boolean | null;

  /** The date and time when the user was created */
  createdAt: Date | null;

  /** The date and time when the user was last updated */
  updatedAt: Date | null;
}
