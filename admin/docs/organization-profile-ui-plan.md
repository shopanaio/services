# Organization & User Profile UI Plan

## Overview

This document describes the UI design for organization management and user profile pages in the admin-next application, following enterprise SaaS patterns (Stripe, Linear, Notion, Figma).

## Data Models (from IAM Service)

### Organization
```typescript
interface Organization {
  id: string;
  name: string;           // URL-friendly slug (e.g., "acme-corp")
  displayName: string;    // Human-readable (e.g., "Acme Corporation")
  createdAt: Date;
  updatedAt: Date;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;    // Avatar URL
  admin: boolean;          // Site-level admin
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Planned fields:
  locale?: string;
  isForbidden?: boolean;
  isDeleted?: boolean;
}
```

### Membership & Roles
- Users belong to organizations via `organization_member`
- Roles are domain-scoped: `"org"` or `"store:{uuid}"`
- Each user has one role per domain per organization

---

## Architecture

### Domain Registration
```
/src/domains/workspace/
├── domain.tsx                    # Register "workspace" domain
├── /organization/
│   ├── register.tsx              # Register organization module
│   └── /page/
│       └── OrganizationPage.tsx
├── /profile/
│   ├── register.tsx              # Register profile module
│   └── /page/
│       └── ProfilePage.tsx
└── /team/
    ├── register.tsx              # Register team module
    └── /page/
        └── TeamPage.tsx
```

### Routes
| Path | Page | Description |
|------|------|-------------|
| `/workspace/organization` | OrganizationPage | Organization settings |
| `/workspace/profile` | ProfilePage | User profile |
| `/workspace/team` | TeamPage | Team members & roles |

---

## Organization Settings Page

### Layout: Sidebar Navigation + Content

```
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Settings                                         [User Menu] │
├────────────────┬───────────────────────────────────────────────────────┤
│                │                                                       │
│  Organization  │  ┌─────────────────────────────────────────────────┐  │
│  ○ General     │  │  ORGANIZATION PREVIEW                           │  │
│  ○ Branding    │  │  ┌──────┐                                       │  │
│                │  │  │ LOGO │  Acme Corporation                     │  │
│  Account       │  │  └──────┘  acme-corp                            │  │
│  ○ Profile     │  │            Created: Jan 15, 2024                │  │
│  ○ Security    │  │                                        [Edit]   │  │
│                │  └─────────────────────────────────────────────────┘  │
│  Team          │                                                       │
│  ○ Members     │  ┌─────────────────────────────────────────────────┐  │
│  ○ Roles       │  │  GENERAL INFORMATION                            │  │
│                │  │                                                 │  │
│  Billing       │  │  Display Name ─────────────────────────────────│  │
│  ○ Plans       │  │  │ Acme Corporation                        │   │  │
│  ○ Invoices    │  │  └─────────────────────────────────────────────│  │
│                │  │                                                 │  │
│                │  │  Organization Slug ────────────────────────────│  │
│                │  │  │ acme-corp                               │   │  │
│                │  │  └─────────────────────────────────────────────│  │
│                │  │  ⚠️ Changing slug will break existing links     │  │
│                │  │                                                 │  │
│                │  │                               [Cancel] [Save]   │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
│                │  ┌─────────────────────────────────────────────────┐  │
│                │  │  DANGER ZONE                                    │  │
│                │  │                                                 │  │
│                │  │  Transfer Ownership          [Transfer...]      │  │
│                │  │  Transfer to another admin                      │  │
│                │  │                                                 │  │
│                │  │  Delete Organization         [Delete...]        │  │
│                │  │  Permanently delete this organization           │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
└────────────────┴───────────────────────────────────────────────────────┘
```

### Sections

#### 1. Organization Preview Card
- Shows logo, display name, slug, creation date
- Quick "Edit" button opens modal for basic info
- Acts as visual summary at top of page

#### 2. General Information
- **Display Name**: Editable text input
- **Organization Slug**: Editable with warning about URL changes
- **Timezone** (future): Select for default timezone
- **Default Language** (future): Locale selector

#### 3. Branding (Sub-page)
```
┌─────────────────────────────────────────────────────────────┐
│  LOGO                                                       │
│                                                             │
│  ┌────────────────┐                                         │
│  │                │  Upload your organization logo          │
│  │   [+] Upload   │  Recommended: 256x256px, PNG or SVG     │
│  │                │                                         │
│  └────────────────┘  [Remove]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BRAND COLORS (Future)                                      │
│                                                             │
│  Primary Color    [■ #1890ff]                               │
│  Accent Color     [■ #52c41a]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Danger Zone
- **Transfer Ownership**: Opens modal with admin selector
- **Delete Organization**: Opens confirmation modal with text input

### Modals

#### Edit Organization Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Edit Organization                                      [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  BASIC INFORMATION                                  │    │
│  │                                                     │    │
│  │  Display Name *                                     │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │ Acme Corporation                              │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │                                                     │    │
│  │  Organization Slug *                                │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │ acme-corp                                     │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │  Only lowercase letters, numbers, and hyphens       │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                    [Cancel]  [Save Changes] │
└─────────────────────────────────────────────────────────────┘
```

#### Transfer Ownership Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Transfer Ownership                                     [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ Warning: This action cannot be undone                   │
│                                                             │
│  You are transferring ownership of "Acme Corporation"       │
│  to another admin. You will retain admin access.            │
│                                                             │
│  Select New Owner                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ○ John Doe (john@acme.com) - Admin                    │  │
│  │ ○ Jane Smith (jane@acme.com) - Admin                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Type "transfer" to confirm                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                                    [Cancel]  [Transfer]     │
└─────────────────────────────────────────────────────────────┘
```

#### Delete Organization Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Delete Organization                                    [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🚨 DANGER: This action is permanent and irreversible       │
│                                                             │
│  Deleting "Acme Corporation" will:                          │
│  • Remove all team members                                  │
│  • Delete all stores and their data                         │
│  • Cancel all active subscriptions                          │
│                                                             │
│  Type "delete acme-corp" to confirm                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                           [Cancel]  [Delete Organization]   │
└─────────────────────────────────────────────────────────────┘
```

---

## User Profile Page

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Settings                                         [User Menu] │
├────────────────┬───────────────────────────────────────────────────────┤
│                │                                                       │
│  Organization  │  ┌─────────────────────────────────────────────────┐  │
│  ○ General     │  │  PROFILE PREVIEW                                │  │
│  ○ Branding    │  │                                                 │  │
│                │  │  ┌────────┐                                     │  │
│  Account       │  │  │        │  John Doe                           │  │
│  ● Profile     │  │  │  J.D.  │  john.doe@acme.com                  │  │
│  ○ Security    │  │  │        │  Admin · Acme Corporation           │  │
│                │  │  └────────┘                         [Edit Photo] │  │
│  Team          │  │                                                 │  │
│  ○ Members     │  └─────────────────────────────────────────────────┘  │
│  ○ Roles       │                                                       │
│                │  ┌─────────────────────────────────────────────────┐  │
│  Billing       │  │  PERSONAL INFORMATION                           │  │
│  ○ Plans       │  │                                                 │  │
│  ○ Invoices    │  │  First Name ───────────────────────────────────│  │
│                │  │  │ John                                    │   │  │
│                │  │  └─────────────────────────────────────────────│  │
│                │  │                                                 │  │
│                │  │  Last Name ────────────────────────────────────│  │
│                │  │  │ Doe                                     │   │  │
│                │  │  └─────────────────────────────────────────────│  │
│                │  │                                                 │  │
│                │  │  Display Name ─────────────────────────────────│  │
│                │  │  │ John Doe                                │   │  │
│                │  │  └─────────────────────────────────────────────│  │
│                │  │                                                 │  │
│                │  │                               [Cancel] [Save]   │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
│                │  ┌─────────────────────────────────────────────────┐  │
│                │  │  EMAIL                                          │  │
│                │  │                                                 │  │
│                │  │  john.doe@acme.com              ✓ Verified      │  │
│                │  │                                 [Change Email]  │  │
│                │  │                                                 │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
│                │  ┌─────────────────────────────────────────────────┐  │
│                │  │  PREFERENCES                                    │  │
│                │  │                                                 │  │
│                │  │  Language          [English (US)         ▼]     │  │
│                │  │  Timezone          [UTC+00:00            ▼]     │  │
│                │  │  Date Format       [MM/DD/YYYY           ▼]     │  │
│                │  │                                                 │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
└────────────────┴───────────────────────────────────────────────────────┘
```

### Sections

#### 1. Profile Preview Card
- Avatar with initials fallback
- Full name, email, role badge
- Organization context
- "Edit Photo" button for avatar upload

#### 2. Personal Information
- **First Name**: Text input
- **Last Name**: Text input
- **Display Name**: Text input (auto-generated from first + last)

#### 3. Email Section
- Shows current email with verification status
- "Change Email" button opens verification flow

#### 4. Preferences
- **Language**: Locale selector (en-US, ru-RU, etc.)
- **Timezone**: Timezone picker
- **Date Format**: Date format selector

### Security Sub-page

```
┌─────────────────────────────────────────────────────────────┐
│  PASSWORD                                                   │
│                                                             │
│  ••••••••••••                              [Change Password]│
│  Last changed: 3 months ago                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TWO-FACTOR AUTHENTICATION                                  │
│                                                             │
│  🔒 Not enabled                              [Enable 2FA]   │
│  Add an extra layer of security                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ACTIVE SESSIONS                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🖥️ Chrome on macOS           Current session        │    │
│  │    San Francisco, US · Last active: Just now        │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📱 Safari on iPhone                     [Revoke]    │    │
│  │    New York, US · Last active: 2 hours ago          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                    [Sign out all sessions]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DANGER ZONE                                                │
│                                                             │
│  Delete Account                           [Delete Account]  │
│  Permanently delete your account and all data               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Modals

#### Edit Avatar Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Change Profile Photo                                   [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ┌─────────────────────┐                        │
│              │                     │                        │
│              │    [+] Upload       │                        │
│              │                     │                        │
│              └─────────────────────┘                        │
│                                                             │
│  Supported formats: PNG, JPG, GIF                           │
│  Maximum file size: 5MB                                     │
│  Recommended: 256x256px or larger, square                   │
│                                                             │
│                              [Remove Photo]  [Save Changes] │
└─────────────────────────────────────────────────────────────┘
```

#### Change Email Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Change Email Address                                   [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current email: john.doe@acme.com                           │
│                                                             │
│  New Email Address                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  We'll send a verification link to your new email.          │
│  Your email won't change until you verify the new address.  │
│                                                             │
│                        [Cancel]  [Send Verification Email]  │
└─────────────────────────────────────────────────────────────┘
```

#### Change Password Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Change Password                                        [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current Password                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ••••••••                                          👁️  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  New Password                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                   👁️  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ✓ At least 8 characters                                    │
│  ✗ Contains uppercase and lowercase                         │
│  ✗ Contains a number                                        │
│                                                             │
│  Confirm New Password                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                   👁️  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                                [Cancel]  [Update Password]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Team Management Page

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Settings                                         [User Menu] │
├────────────────┬───────────────────────────────────────────────────────┤
│                │                                                       │
│  Organization  │  ┌─────────────────────────────────────────────────┐  │
│  ○ General     │  │  TEAM MEMBERS                    [Invite Member] │  │
│  ○ Branding    │  ├─────────────────────────────────────────────────┤  │
│                │  │                                                 │  │
│  Account       │  │  🔍 Search members...                           │  │
│  ○ Profile     │  │                                                 │  │
│  ○ Security    │  │  ┌─────┬────────────────────┬───────┬────────┐  │  │
│                │  │  │     │ Member             │ Role  │ Actions│  │  │
│  Team          │  │  ├─────┼────────────────────┼───────┼────────┤  │  │
│  ● Members     │  │  │ [A] │ John Doe           │ Owner │   ···  │  │  │
│  ○ Roles       │  │  │     │ john@acme.com      │       │        │  │  │
│                │  │  ├─────┼────────────────────┼───────┼────────┤  │  │
│  Billing       │  │  │ [A] │ Jane Smith         │ Admin │   ···  │  │  │
│  ○ Plans       │  │  │     │ jane@acme.com      │       │        │  │  │
│  ○ Invoices    │  │  ├─────┼────────────────────┼───────┼────────┤  │  │
│                │  │  │ [A] │ Bob Wilson         │Member │   ···  │  │  │
│                │  │  │     │ bob@acme.com       │       │        │  │  │
│                │  │  └─────┴────────────────────┴───────┴────────┘  │  │
│                │  │                                                 │  │
│                │  │  Showing 3 of 3 members                         │  │
│                │  │                                                 │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
│                │  ┌─────────────────────────────────────────────────┐  │
│                │  │  PENDING INVITATIONS                            │  │
│                │  │                                                 │  │
│                │  │  ┌───────────────────────────────────────────┐  │  │
│                │  │  │ 📧 alice@example.com                      │  │  │
│                │  │  │    Invited as: Editor · Expires in 7 days │  │  │
│                │  │  │                     [Resend] [Cancel]     │  │  │
│                │  │  └───────────────────────────────────────────┘  │  │
│                │  │                                                 │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
└────────────────┴───────────────────────────────────────────────────────┘
```

### Member Actions Menu
```
┌─────────────────────┐
│ View Profile        │
│ Change Role     ▶   │
├─────────────────────┤
│ Remove from Team    │
└─────────────────────┘
```

### Invite Member Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Invite Team Member                                     [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Email Address                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ email@example.com                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Role                                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ○ Admin                                               │  │
│  │   Full access to all organization settings            │  │
│  │                                                       │  │
│  │ ○ Editor                                              │  │
│  │   Can edit content but not organization settings      │  │
│  │                                                       │  │
│  │ ○ Viewer                                              │  │
│  │   Read-only access to content                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Personal Message (optional)                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Join our team on Shopana!                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                               [Cancel]  [Send Invitation]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Roles Management Page

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Settings                                         [User Menu] │
├────────────────┬───────────────────────────────────────────────────────┤
│                │                                                       │
│  Organization  │  ┌─────────────────────────────────────────────────┐  │
│  ○ General     │  │  ROLES                           [Create Role]  │  │
│  ○ Branding    │  ├─────────────────────────────────────────────────┤  │
│                │  │                                                 │  │
│  Account       │  │  ┌───────────────────────────────────────────┐  │  │
│  ○ Profile     │  │  │ 👑 Owner                         System   │  │  │
│  ○ Security    │  │  │    Full access · Cannot be modified       │  │  │
│                │  │  │    1 member                               │  │  │
│  Team          │  │  └───────────────────────────────────────────┘  │  │
│  ○ Members     │  │                                                 │  │
│  ● Roles       │  │  ┌───────────────────────────────────────────┐  │  │
│                │  │  │ 🛡️ Admin                         System   │  │  │
│  Billing       │  │  │    Organization management access         │  │  │
│  ○ Plans       │  │  │    2 members                     [Edit]   │  │  │
│  ○ Invoices    │  │  └───────────────────────────────────────────┘  │  │
│                │  │                                                 │  │
│                │  │  ┌───────────────────────────────────────────┐  │  │
│                │  │  │ ✏️ Editor                        Custom   │  │  │
│                │  │  │    Content editing permissions            │  │  │
│                │  │  │    5 members              [Edit] [Delete] │  │  │
│                │  │  └───────────────────────────────────────────┘  │  │
│                │  │                                                 │  │
│                │  │  ┌───────────────────────────────────────────┐  │  │
│                │  │  │ 👁️ Viewer                        Custom   │  │  │
│                │  │  │    Read-only access                       │  │  │
│                │  │  │    3 members              [Edit] [Delete] │  │  │
│                │  │  └───────────────────────────────────────────┘  │  │
│                │  │                                                 │  │
│                │  └─────────────────────────────────────────────────┘  │
│                │                                                       │
└────────────────┴───────────────────────────────────────────────────────┘
```

### Edit Role Modal
```
┌─────────────────────────────────────────────────────────────┐
│  Edit Role: Editor                                      [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Role Name                                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Editor                                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Description                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Content editing permissions                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PERMISSIONS                                        │    │
│  │                                                     │    │
│  │  Products                                           │    │
│  │  ├ ☑ Read     ☑ Write    ☐ Admin                   │    │
│  │                                                     │    │
│  │  Orders                                             │    │
│  │  ├ ☑ Read     ☐ Write    ☐ Admin                   │    │
│  │                                                     │    │
│  │  Inventory                                          │    │
│  │  ├ ☑ Read     ☑ Write    ☐ Admin                   │    │
│  │                                                     │    │
│  │  Members                                            │    │
│  │  ├ ☑ Read     ☐ Write    ☐ Admin                   │    │
│  │                                                     │    │
│  │  Settings                                           │    │
│  │  ├ ☐ Read     ☐ Write    ☐ Admin                   │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                               [Cancel]  [Save Changes]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Structure

### New Components to Create

```
/src/domains/workspace/
├── domain.tsx
├── /shared/
│   ├── WorkspaceNav.tsx              # Sidebar navigation
│   ├── PreviewCard.tsx               # Organization/Profile preview
│   ├── DangerZone.tsx                # Danger zone section
│   └── SettingsSection.tsx           # Reusable section wrapper
│
├── /organization/
│   ├── register.tsx
│   ├── /page/
│   │   ├── OrganizationPage.tsx
│   │   └── OrganizationBrandingPage.tsx
│   ├── /components/
│   │   ├── OrganizationPreview.tsx
│   │   ├── OrganizationForm.tsx
│   │   └── LogoUploader.tsx
│   └── /modals/
│       ├── EditOrganizationModal.tsx
│       ├── TransferOwnershipModal.tsx
│       └── DeleteOrganizationModal.tsx
│
├── /profile/
│   ├── register.tsx
│   ├── /page/
│   │   ├── ProfilePage.tsx
│   │   └── SecurityPage.tsx
│   ├── /components/
│   │   ├── ProfilePreview.tsx
│   │   ├── PersonalInfoForm.tsx
│   │   ├── PreferencesForm.tsx
│   │   ├── SessionsList.tsx
│   │   └── AvatarUploader.tsx
│   └── /modals/
│       ├── EditAvatarModal.tsx
│       ├── ChangeEmailModal.tsx
│       ├── ChangePasswordModal.tsx
│       └── DeleteAccountModal.tsx
│
└── /team/
    ├── register.tsx
    ├── /page/
    │   ├── MembersPage.tsx
    │   └── RolesPage.tsx
    ├── /components/
    │   ├── MembersTable.tsx
    │   ├── MemberRow.tsx
    │   ├── PendingInvitations.tsx
    │   ├── RoleCard.tsx
    │   └── PermissionsMatrix.tsx
    └── /modals/
        ├── InviteMemberModal.tsx
        ├── EditMemberRoleModal.tsx
        ├── RemoveMemberModal.tsx
        ├── CreateRoleModal.tsx
        └── EditRoleModal.tsx
```

---

## Implementation Priority

### Phase 1: Core Profile & Organization
1. Domain & module registration
2. WorkspaceNav sidebar component
3. ProfilePage with preview card
4. PersonalInfoForm (name editing)
5. OrganizationPage with preview
6. OrganizationForm (basic editing)

### Phase 2: Security & Settings
1. AvatarUploader & EditAvatarModal
2. ChangeEmailModal
3. ChangePasswordModal
4. SecurityPage with sessions
5. LogoUploader for organization
6. PreferencesForm (locale, timezone)

### Phase 3: Team Management
1. MembersPage with table
2. InviteMemberModal
3. Member actions (change role, remove)
4. PendingInvitations component

### Phase 4: Roles & Permissions
1. RolesPage with role cards
2. CreateRoleModal
3. EditRoleModal with permissions matrix
4. Role assignment in member actions

### Phase 5: Danger Zone
1. TransferOwnershipModal
2. DeleteOrganizationModal
3. DeleteAccountModal

---

## Design Tokens & Styling

Follow existing patterns from admin-next:
- Use `Paper` component for sections
- Use `PaperHeader` for section titles
- Use Ant Design form components
- Use existing modal system (`useModalStack`)
- Follow color scheme from theme provider

### Danger Zone Styling
```css
.danger-zone {
  border: 1px solid var(--ant-color-error-border);
  background: var(--ant-color-error-bg);
}
```

### Preview Card Styling
```css
.preview-card {
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border);
  border-radius: var(--ant-border-radius-lg);
  padding: var(--ant-padding-lg);
}
```
