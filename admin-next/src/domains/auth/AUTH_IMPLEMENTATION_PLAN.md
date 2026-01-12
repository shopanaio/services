# Auth Domain Implementation Plan

## Senior Staff Engineer Architecture Design

This document outlines a comprehensive plan for implementing **user authentication** (sign-in, sign-up) and **session management** in the auth domain using modern React/Next.js/GraphQL patterns and best practices.

> **Scope**: This plan focuses on core authentication flows. Permission management and authorization are out of scope and will be addressed separately.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Directory Structure](#directory-structure)
4. [Core Patterns & Principles](#core-patterns--principles)
5. [Implementation Phases](#implementation-phases)
6. [Detailed Component Specifications](#detailed-component-specifications)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Migration Path](#migration-path)

---

## Current State Analysis

### Existing Infrastructure
- **GraphQL Backend**: Full auth mutations available (`signIn`, `signUp`, `signOut`, `tokenRefresh`)
- **Token Strategy**: Dual-token (JWT 15min + Session 7d) via Better Auth
- **Hooks Location**: Currently in `workspace` domain (should migrate to `auth`)
- **Form Library**: React Hook Form v7.70 + Zod v4.3
- **UI Framework**: Ant Design 6.x

### Current Limitations
- Auth hooks scattered in workspace domain
- No centralized auth state management
- Missing password reset flow
- No email verification flow
- Basic error handling without field-level mapping
- No optimistic UI patterns
- Session polling every 5 minutes (not reactive)

---

## Target Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Auth Domain                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │   Modals    │  │      Components         │ │
│  │  - SignIn   │  │ - ForgotPwd │  │  - AuthGuard            │ │
│  │  - SignUp   │  │ - ResetPwd  │  │  - SessionProvider      │ │
│  │  - Verify   │  │ - VerifyOTP │  │  - ProtectedRoute       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┴──────────────────────┘               │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────────────┐ │
│  │                    Auth Context                            │ │
│  │  - user: User | null                                       │ │
│  │  - session: Session | null                                 │ │
│  │  - isAuthenticated: boolean                                │ │
│  │  - isLoading: boolean                                      │ │
│  │  - signIn / signUp / signOut / refresh                     │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────────────────┐ │
│  │                  Auth Operations Layer                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│ │
│  │  │   Hooks     │  │   Schemas   │  │    GraphQL Ops      ││ │
│  │  │ useSignIn   │  │ signInSchema│  │ SIGN_IN_MUTATION    ││ │
│  │  │ useSignUp   │  │ signUpSchema│  │ SIGN_UP_MUTATION    ││ │
│  │  │ useSession  │  │ resetSchema │  │ CURRENT_USER_QUERY  ││ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Colocation**: All auth-related code lives in the auth domain
2. **Single Source of Truth**: Auth state managed via React Context + Apollo Cache
3. **Type Safety**: End-to-end TypeScript with Zod validation
4. **Separation of Concerns**: Clear boundaries between UI, state, and data layers
5. **Composability**: Small, focused hooks that can be composed together
6. **Error Resilience**: Comprehensive error handling with user-friendly messages

---

## Directory Structure

```
auth/
├── domain.tsx                      # Domain registration
├── index.ts                        # Public API exports
├── AUTH_IMPLEMENTATION_PLAN.md     # This document
│
├── components/
│   ├── index.ts
│   ├── auth-guard.tsx              # Route protection component
│   └── session-provider.tsx        # Auth context provider
│
├── context/
│   ├── index.ts
│   ├── auth-context.tsx            # React context definition
│   ├── auth-provider.tsx           # Context provider implementation
│   └── types.ts                    # Context types
│
├── graphql/
│   ├── index.ts
│   ├── fragments.ts                # Shared GraphQL fragments
│   ├── mutations.ts                # Auth mutations
│   └── queries.ts                  # Auth queries
│
├── hooks/
│   ├── index.ts
│   ├── use-auth.ts                 # Main auth hook (consumes context)
│   ├── use-sign-in.ts              # Sign in mutation hook
│   ├── use-sign-up.ts              # Sign up mutation hook
│   ├── use-sign-out.ts             # Sign out mutation hook
│   ├── use-session.ts              # Session state hook
│   └── use-token-refresh.ts        # Token refresh hook
│
├── layouts/
│   ├── index.ts
│   └── auth-layout.tsx             # Auth pages layout
│
├── schemas/
│   ├── index.ts
│   ├── sign-in.schema.ts           # Sign in validation
│   ├── sign-up.schema.ts           # Sign up validation
│   └── common.schema.ts            # Shared validation rules (email, password)
│
├── sign-in/
│   ├── register.tsx                # Module registration
│   ├── sign-in-page.tsx            # Page container component
│   └── components/
│       └── sign-in-form.tsx        # Form presentation component
│
├── sign-up/
│   ├── register.tsx                # Module registration
│   ├── sign-up-page.tsx            # Page container component
│   └── components/
│       ├── sign-up-form.tsx        # Form presentation component
│       └── password-strength.tsx   # Password strength indicator
│
├── types/
│   ├── index.ts
│   ├── auth.types.ts               # Auth-specific types
│   ├── user.types.ts               # User types
│   └── error.types.ts              # Error types
│
└── utils/
    ├── index.ts
    ├── token-storage.ts            # Token utilities
    ├── error-mapper.ts             # Map GraphQL errors to form errors
    └── validation-messages.ts      # Centralized validation messages
```

---

## Core Patterns & Principles

### Pattern 1: Auth Context with Apollo Integration

```typescript
// context/auth-context.tsx
import { createContext } from 'react';
import type { AuthContextValue } from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

// context/types.ts
export interface AuthContextValue {
  // State
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}
```

### Pattern 2: Form with Zod Schema + Field-Level Errors

```typescript
// schemas/sign-in.schema.ts
import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.schema';

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional().default(false),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

// schemas/common.schema.ts
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be 255 characters or less');

export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

export const passwordConfirmSchema = (passwordField: string = 'password') =>
  z.string().min(1, 'Please confirm your password');

export const passwordWithConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

### Pattern 3: GraphQL Error to Form Error Mapping

```typescript
// utils/error-mapper.ts
import type { ApiGenericUserError } from '@/graphql/types';

interface ErrorMapping {
  [code: string]: {
    field?: string;
    message: string;
  };
}

/**
 * Maps GraphQL error codes from IAM service to user-friendly messages.
 *
 * Actual error codes from the API:
 * - INVALID_CREDENTIALS: Sign in failed (wrong email/password)
 * - EMAIL_ALREADY_EXISTS: Sign up failed (email taken) - includes field: ["email"]
 * - SIGNUP_FAILED: Sign up internal error
 * - INTERNAL_ERROR: Unexpected server error
 * - NETWORK_ERROR: Client-side network failure (added by hooks)
 */
const AUTH_ERROR_MAP: ErrorMapping = {
  // Sign In Errors
  INVALID_CREDENTIALS: {
    field: 'password',
    message: 'Invalid email or password',
  },

  // Sign Up Errors
  EMAIL_ALREADY_EXISTS: {
    field: 'email',
    message: 'A user with this email already exists',
  },
  SIGNUP_FAILED: {
    message: 'Failed to create account. Please try again.',
  },

  // General Errors
  INTERNAL_ERROR: {
    message: 'An unexpected error occurred. Please try again.',
  },
  NETWORK_ERROR: {
    message: 'Unable to connect. Please check your connection.',
  },
};

/**
 * Maps GraphQL userErrors to react-hook-form field errors.
 *
 * The IAM API returns errors in format:
 * { code: string, message: string, field?: string[] }
 *
 * Priority:
 * 1. Use field from error response if present (e.g., ["email"])
 * 2. Fall back to field mapping from AUTH_ERROR_MAP
 * 3. Treat as general error if no field association
 */
export function mapGraphQLErrorsToForm<T extends Record<string, any>>(
  errors: ApiGenericUserError[],
  setError: (name: keyof T, error: { message: string }) => void
): { hasFieldErrors: boolean; generalErrors: string[] } {
  const generalErrors: string[] = [];
  let hasFieldErrors = false;

  for (const error of errors) {
    const mapping = error.code ? AUTH_ERROR_MAP[error.code] : null;
    const userMessage = mapping?.message || error.message;

    // Priority 1: Use field from API response (e.g., EMAIL_ALREADY_EXISTS returns field: ["email"])
    if (error.field && error.field.length > 0) {
      const fieldName = error.field[0]; // First element is the field name
      setError(fieldName as keyof T, { message: userMessage });
      hasFieldErrors = true;
    }
    // Priority 2: Use field from error mapping
    else if (mapping?.field) {
      setError(mapping.field as keyof T, { message: userMessage });
      hasFieldErrors = true;
    }
    // Priority 3: General error (no field association)
    else {
      generalErrors.push(userMessage);
    }
  }

  return { hasFieldErrors, generalErrors };
}

/**
 * Type-safe error result for auth operations
 */
export interface AuthOperationResult<T = unknown> {
  success: boolean;
  data: T | null;
  userErrors: ApiGenericUserError[];
}
```

### Pattern 4: Composable Auth Hook

```typescript
// hooks/use-sign-in.ts
import { useMutation } from '@apollo/client';
import { useCallback } from 'react';
import { SIGN_IN_MUTATION, CURRENT_USER_QUERY } from '../graphql';
import type { SignInInput, SignInResult } from '../types';

export interface UseSignInReturn {
  signIn: (input: SignInInput) => Promise<SignInResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSignIn(): UseSignInReturn {
  const [mutate, { loading, error, reset }] = useMutation(SIGN_IN_MUTATION, {
    // Refetch current user after successful sign in
    refetchQueries: [{ query: CURRENT_USER_QUERY }],
    awaitRefetchQueries: true,
  });

  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResult> => {
      try {
        const { data } = await mutate({
          variables: { input },
        });

        const payload = data?.authMutation?.signIn;

        return {
          success: !!payload?.user && payload.userErrors.length === 0,
          user: payload?.user ?? null,
          token: payload?.token ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (err) {
        return {
          success: false,
          user: null,
          token: null,
          userErrors: [{
            code: 'NETWORK_ERROR',
            message: 'Unable to connect. Please check your connection.',
          }],
        };
      }
    },
    [mutate]
  );

  return { signIn, loading, error: error ?? null, reset };
}
```

### Pattern 5: Form Component Structure (Presentation + Container)

```typescript
// sign-in/sign-in-page.tsx (Container)
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { message } from 'antd';
import { SignInForm } from './components/sign-in-form';
import { useSignIn } from '../hooks';
import { signInSchema, type SignInFormValues } from '../schemas';
import { mapGraphQLErrorsToForm } from '../utils';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, loading } = useSignIn();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  const onSubmit = useCallback(
    async (values: SignInFormValues) => {
      const result = await signIn({
        email: values.email,
        password: values.password,
      });

      if (!result.success) {
        const { generalErrors } = mapGraphQLErrorsToForm(
          result.userErrors,
          form.setError
        );

        if (generalErrors.length > 0) {
          message.error(generalErrors[0]);
        }
        return;
      }

      message.success('Welcome back!');
      router.push('/workspace/organization');
    },
    [signIn, form.setError, router]
  );

  return (
    <SignInForm
      form={form}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}

// sign-in/components/sign-in-form.tsx (Presentation)
'use client';

import { Controller, type UseFormReturn } from 'react-hook-form';
import { Button, Input, Typography, Checkbox, Flex } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { SignInFormValues } from '../../schemas';
import { FormField, FormError } from '../../components/form';
import { useStyles } from './sign-in-form.styles';

interface SignInFormProps {
  form: UseFormReturn<SignInFormValues>;
  onSubmit: (values: SignInFormValues) => Promise<void>;
  loading: boolean;
}

export function SignInForm({ form, onSubmit, loading }: SignInFormProps) {
  const { styles } = useStyles();
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <Typography.Title level={2} className={styles.title}>
        Sign In
      </Typography.Title>

      <Typography.Text type="secondary" className={styles.subtitle}>
        Welcome back! Please enter your credentials.
      </Typography.Text>

      <FormField label="Email" error={errors.email?.message}>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              prefix={<MailOutlined />}
              placeholder="email@example.com"
              autoComplete="email"
              status={errors.email ? 'error' : undefined}
              size="large"
            />
          )}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message}>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              autoComplete="current-password"
              status={errors.password ? 'error' : undefined}
              size="large"
            />
          )}
        />
      </FormField>

      <Flex justify="space-between" align="center" className={styles.options}>
        <Controller
          name="rememberMe"
          control={control}
          render={({ field: { value, onChange, ...field } }) => (
            <Checkbox
              {...field}
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
            >
              Remember me
            </Checkbox>
          )}
        />
        <Link href="/forgot-password">Forgot password?</Link>
      </Flex>

      <Button
        type="primary"
        htmlType="submit"
        loading={loading}
        block
        size="large"
      >
        Sign In
      </Button>

      <Typography.Text className={styles.footer}>
        Don't have an account? <Link href="/sign-up">Create one</Link>
      </Typography.Text>
    </form>
  );
}
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**Objective**: Set up auth domain structure and migrate existing functionality

**Tasks**:
1. Create directory structure as specified above
2. Move GraphQL operations from workspace to auth domain
3. Create auth context and provider
4. Create shared form components (FormField, FormError)
5. Implement Zod schemas for all auth forms
6. Create error mapping utilities

**Deliverables**:
- `context/` - Auth context with types
- `graphql/` - All auth-related GraphQL operations
- `schemas/` - Zod validation schemas
- `utils/error-mapper.ts` - Error mapping utility
- `components/form/` - Shared form components

### Phase 2: Auth Hooks Layer

**Objective**: Create composable hooks for all auth operations

**Tasks**:
1. Implement `useSignIn` hook with Apollo integration
2. Implement `useSignUp` hook with Apollo integration
3. Implement `useSignOut` hook
4. Implement `useSession` hook (enhanced version)
5. Implement `useTokenRefresh` hook
6. Create `useAuth` main hook that consumes context

**Deliverables**:
- `hooks/use-sign-in.ts`
- `hooks/use-sign-up.ts`
- `hooks/use-sign-out.ts`
- `hooks/use-session.ts`
- `hooks/use-token-refresh.ts`
- `hooks/use-auth.ts`

### Phase 3: Auth Pages Refactor

**Objective**: Refactor sign-in and sign-up pages with new patterns

**Tasks**:
1. Refactor `sign-in-page.tsx` using new form patterns
2. Create `SignInForm` presentation component
3. Refactor `sign-up-page.tsx` using new form patterns
4. Create `SignUpForm` presentation component
5. Add password strength indicator component
6. Implement proper loading states and error handling

**Deliverables**:
- Refactored sign-in page and form
- Refactored sign-up page and form
- Password strength component
- Improved error handling throughout

### Phase 4: Session Management Enhancement

**Objective**: Improve session management and auth guard

**Tasks**:
1. Enhance `AuthGuard` with better loading states
2. Implement token refresh on Apollo link level
3. Add session expiry detection and auto-logout
4. Implement "Remember me" functionality
5. Add multi-tab session synchronization

**Deliverables**:
- Enhanced `auth-guard.tsx`
- Token refresh Apollo link
- Session sync utilities

---

### Future Phases (Out of Scope)

The following features are intentionally deferred:

**Password Recovery Flow**:
- Forgot password / reset password pages
- Requires backend email service integration

**Email Verification Flow**:
- Verify email page after sign up
- Currently disabled in Better Auth config (`requireEmailVerification: false`)

**Permission Management**:
- Role-based access control UI
- Authorization checks (`useAuthorize` hook)
- Protected routes with permission requirements

---

## Detailed Component Specifications

### AuthProvider Component

```typescript
// components/session-provider.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { AuthContext } from '../context';
import { CURRENT_USER_QUERY } from '../graphql';
import { useSignIn, useSignUp, useSignOut, useTokenRefresh } from '../hooks';
import type { AuthContextValue, AuthError } from '../context/types';

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const client = useApolloClient();
  const [error, setError] = useState<AuthError | null>(null);

  // Current user query with polling
  const { data, loading, refetch } = useQuery(CURRENT_USER_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5 * 60 * 1000, // 5 minutes
    onError: (err) => {
      setError({
        code: 'SESSION_ERROR',
        message: 'Failed to verify session',
      });
    },
  });

  // Auth operation hooks
  const { signIn: doSignIn, loading: signInLoading } = useSignIn();
  const { signUp: doSignUp, loading: signUpLoading } = useSignUp();
  const { signOut: doSignOut, loading: signOutLoading } = useSignOut();
  const { refreshToken } = useTokenRefresh();

  const user = data?.userQuery?.current ?? null;
  const isAuthenticated = !!user;
  const isLoading = loading || signInLoading || signUpLoading || signOutLoading;

  // Sign in with error handling
  const signIn = useCallback(
    async (input: SignInInput) => {
      setError(null);
      const result = await doSignIn(input);
      if (!result.success && result.userErrors.length > 0) {
        setError({
          code: result.userErrors[0].code ?? 'SIGN_IN_ERROR',
          message: result.userErrors[0].message,
        });
      }
      return result;
    },
    [doSignIn]
  );

  // Sign up with error handling
  const signUp = useCallback(
    async (input: SignUpInput) => {
      setError(null);
      const result = await doSignUp(input);
      if (!result.success && result.userErrors.length > 0) {
        setError({
          code: result.userErrors[0].code ?? 'SIGN_UP_ERROR',
          message: result.userErrors[0].message,
        });
      }
      return result;
    },
    [doSignUp]
  );

  // Sign out with cache clear
  const signOut = useCallback(
    async (options?: SignOutOptions) => {
      setError(null);
      await doSignOut(options);
      await client.resetStore();
    },
    [doSignOut, client]
  );

  // Refresh session
  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      refreshSession,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### Enhanced AuthGuard Component

```typescript
// components/auth-guard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Spin, Flex } from 'antd';
import { useAuth } from '../hooks';
import { useStyles } from './auth-guard.styles';

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ['/sign-in', '/sign-up'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { styles } = useStyles();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    if (isLoading) return;

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && isPublicPath) {
      const returnUrl = searchParams.get('returnUrl');
      router.replace(returnUrl || '/workspace/organization');
      return;
    }

    // Redirect unauthenticated users to sign in
    if (!isAuthenticated && !isPublicPath) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/sign-in?returnUrl=${returnUrl}`);
      return;
    }
  }, [isAuthenticated, isLoading, isPublicPath, pathname, router, searchParams]);

  // Show loading state
  if (isLoading) {
    return (
      <Flex justify="center" align="center" className={styles.loading}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  // Don't render auth pages if authenticated
  if (isAuthenticated && isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
```

### Password Strength Indicator

```typescript
// sign-up/components/password-strength.tsx
'use client';

import { useMemo } from 'react';
import { Typography, Progress, Flex } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useStyles } from './password-strength.styles';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const { styles } = useStyles();

  const { score, requirements } = useMemo(() => {
    const reqs = REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }));
    const metCount = reqs.filter((r) => r.met).length;
    return {
      score: (metCount / REQUIREMENTS.length) * 100,
      requirements: reqs,
    };
  }, [password]);

  const strengthLevel = useMemo(() => {
    if (score === 0) return { label: '', color: '#d9d9d9' };
    if (score <= 40) return { label: 'Weak', color: '#ff4d4f' };
    if (score <= 60) return { label: 'Fair', color: '#faad14' };
    if (score <= 80) return { label: 'Good', color: '#1890ff' };
    return { label: 'Strong', color: '#52c41a' };
  }, [score]);

  if (!password) return null;

  return (
    <div className={styles.container}>
      <Flex justify="space-between" align="center" className={styles.header}>
        <Typography.Text type="secondary" className={styles.label}>
          Password strength
        </Typography.Text>
        <Typography.Text style={{ color: strengthLevel.color }}>
          {strengthLevel.label}
        </Typography.Text>
      </Flex>

      <Progress
        percent={score}
        showInfo={false}
        strokeColor={strengthLevel.color}
        size="small"
      />

      {showRequirements && (
        <ul className={styles.requirements}>
          {requirements.map((req, index) => (
            <li
              key={index}
              className={req.met ? styles.requirementMet : styles.requirementUnmet}
            >
              {req.met ? (
                <CheckOutlined className={styles.iconMet} />
              ) : (
                <CloseOutlined className={styles.iconUnmet} />
              )}
              <Typography.Text
                type={req.met ? undefined : 'secondary'}
                className={styles.requirementText}
              >
                {req.label}
              </Typography.Text>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Security Considerations

### 1. Token Storage
- **Access Token**: Stored in memory (React state/context), never in localStorage
- **Refresh Token**: HTTP-only cookie set by server (current implementation)
- **Session**: Managed server-side with Better Auth

### 2. CSRF Protection
- All mutations use GraphQL over POST
- Credentials included via `credentials: 'include'`
- Server validates session cookie

### 3. XSS Prevention
- No token storage in localStorage or sessionStorage
- React's built-in XSS protection for rendered content
- Sanitize any user-generated content

### 4. Rate Limiting
- Already configured: 100 requests per 60 seconds
- Consider adding client-side rate limiting for auth forms
- Implement exponential backoff on failures

### 5. Password Security
- Minimum 8 characters (enforced client and server)
- Maximum 128 characters
- Strength indicator encourages strong passwords
- No password hints or security questions

### 6. Session Security
- 7-day session expiry
- IP and user-agent tracking
- Ability to revoke all sessions
- Session refresh on activity

### 7. Error Messages
- Generic error messages for auth failures
- No username enumeration (same message for invalid email/password)
- Detailed errors only in development mode

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/hooks/use-sign-in.test.ts
import { renderHook, act } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useSignIn } from '../hooks/use-sign-in';
import { SIGN_IN_MUTATION } from '../graphql';

const mocks = [
  {
    request: {
      query: SIGN_IN_MUTATION,
      variables: {
        input: { email: 'test@example.com', password: 'password123' },
      },
    },
    result: {
      data: {
        authMutation: {
          signIn: {
            user: { id: '1', email: 'test@example.com' },
            token: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 900 },
            userErrors: [],
          },
        },
      },
    },
  },
];

describe('useSignIn', () => {
  it('should sign in successfully', async () => {
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }) => (
        <MockedProvider mocks={mocks}>{children}</MockedProvider>
      ),
    });

    await act(async () => {
      const response = await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/pages/sign-in.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from '../sign-in/sign-in-page';

describe('SignInPage', () => {
  it('should display validation errors', async () => {
    render(<SignInPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // Assert redirect or success state
    });
  });
});
```

### E2E Tests (Playwright)
```typescript
// e2e/tests/auth/sign-in.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sign In Flow', () => {
  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'ValidPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/workspace/organization');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.ant-message-error')).toBeVisible();
  });
});
```

---

## Migration Path

### Step 1: Create New Structure (Non-Breaking)
1. Create new directories and files
2. Keep existing code functional
3. Add new implementations alongside old

### Step 2: Migrate GraphQL Operations
1. Move fragments from workspace to auth domain
2. Update imports throughout codebase
3. Deprecate old locations

### Step 3: Migrate Hooks
1. Create new hooks in auth domain
2. Update workspace hooks to re-export from auth
3. Add deprecation warnings

### Step 4: Migrate Pages
1. Refactor one page at a time
2. Start with sign-in (most used)
3. Follow with sign-up

### Step 5: Cleanup
1. Remove deprecated code
2. Update documentation
3. Remove re-exports from workspace

---

## Success Metrics

1. **Code Quality**
   - 100% TypeScript coverage
   - All forms validated with Zod schemas
   - Consistent error handling patterns

2. **User Experience**
   - Form validation feedback under 100ms
   - Sign-in/sign-up complete under 2 seconds
   - Clear error messages for all failure states

3. **Security**
   - No tokens in localStorage
   - Rate limiting active
   - Proper CSRF protection

4. **Maintainability**
   - Single domain for all auth code
   - Documented patterns
   - Comprehensive test coverage

---

## Appendix A: Actual GraphQL API Schema (IAM Service)

> **Source**: `services/iam/src/api/graphql-admin/schema/`

### Root Operations

```graphql
type Query {
  userQuery: UserQuery!
}

type Mutation {
  authMutation: AuthMutation!
  userMutation: UserMutation!
}
```

### Authentication Mutations

```graphql
type AuthMutation {
  signUp(input: UserSignUpInput!): UserSignUpPayload!
  signIn(input: UserSignInInput!): UserSignInPayload!
  signOut(input: UserSignOutInput!): UserSignOutPayload!
  tokenRefresh(input: UserTokenRefreshInput!): UserTokenRefreshPayload!
}
```

### User Queries

```graphql
type UserQuery {
  """Get current authenticated admin user"""
  current: User
}
```

### Input Types

```graphql
input UserSignInInput {
  email: Email!
  password: String!
}

input UserSignUpInput {
  email: Email!
  password: String!
}

input UserSignOutInput {
  allSessions: Boolean  # Sign out from all devices
}

input UserTokenRefreshInput {
  refreshToken: String!
}
```

### Payload Types

```graphql
type UserSignInPayload {
  user: User
  token: AuthTokenPayload
  userErrors: [GenericUserError!]!
}

type UserSignUpPayload {
  user: User
  token: AuthTokenPayload
  userErrors: [GenericUserError!]!
}

type UserSignOutPayload {
  success: Boolean!
  userErrors: [GenericUserError!]!
}

type UserTokenRefreshPayload {
  token: AuthTokenPayload
  userErrors: [GenericUserError!]!
}
```

### Core Types

```graphql
"""User type representing admin users (CMS/backoffice)"""
type User @key(fields: "id") {
  id: ID!
  email: Email!
  emailVerified: Boolean
  firstName: String
  lastName: String
  avatar: String
  locale: LocaleCode
  isAdmin: Boolean
  isForbidden: Boolean
  isDeleted: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}

"""Authentication tokens"""
type AuthTokenPayload {
  accessToken: String!   # JWT, 15 min expiry
  refreshToken: String!  # Session token, 7 day expiry
  expiresIn: Int!        # Seconds (900)
}

"""Generic user error interface"""
interface UserError {
  message: String!
  field: [String!]
  code: String
}

type GenericUserError implements UserError {
  message: String!
  field: [String!]       # Path to field that caused error, e.g., ["email"]
  code: String           # Error code for programmatic handling
}

scalar DateTime
scalar Email
scalar LocaleCode
```

---

## Appendix B: Actual Error Codes (IAM Service)

> **Source**: `services/iam/src/scripts/user/`

### Sign In Errors (`UserSignInScript.ts`)

| Code | Message | Field | When |
|------|---------|-------|------|
| `INVALID_CREDENTIALS` | Invalid email or password | - | Wrong email or password |
| `INTERNAL_ERROR` | An unexpected error occurred | - | Server exception |

### Sign Up Errors (`UserSignUpScript.ts`)

| Code | Message | Field | When |
|------|---------|-------|------|
| `EMAIL_ALREADY_EXISTS` | A user with this email already exists | `["email"]` | Email taken |
| `SIGNUP_FAILED` | Failed to create user | - | Internal error |
| `INTERNAL_ERROR` | An unexpected error occurred | - | Server exception |

### Token Refresh Errors (`TokenRefreshScript.ts`)

| Code | Message | Field | When |
|------|---------|-------|------|
| `INVALID_REFRESH_TOKEN` | Invalid or expired refresh token | - | Bad/expired token |
| `INTERNAL_ERROR` | An unexpected error occurred | - | Server exception |

### Current User Errors (`GetCurrentUserScript.ts`)

| Code | Message | Field | When |
|------|---------|-------|------|
| `UNAUTHORIZED` | Invalid or expired token | - | No valid session |
| `INTERNAL_ERROR` | An unexpected error occurred | - | Server exception |

---

## Appendix C: GraphQL Operations for Auth Domain

### Mutations

```graphql
# Sign In
mutation SignIn($input: UserSignInInput!) {
  authMutation {
    signIn(input: $input) {
      user { ...UserFields }
      token { ...AuthTokenFields }
      userErrors { ...UserErrorFields }
    }
  }
}

# Sign Up
mutation SignUp($input: UserSignUpInput!) {
  authMutation {
    signUp(input: $input) {
      user { ...UserFields }
      token { ...AuthTokenFields }
      userErrors { ...UserErrorFields }
    }
  }
}

# Sign Out
mutation SignOut($input: UserSignOutInput!) {
  authMutation {
    signOut(input: $input) {
      success
      userErrors { ...UserErrorFields }
    }
  }
}

# Token Refresh
mutation TokenRefresh($input: UserTokenRefreshInput!) {
  authMutation {
    tokenRefresh(input: $input) {
      token { ...AuthTokenFields }
      userErrors { ...UserErrorFields }
    }
  }
}
```

### Queries

```graphql
# Current User (Session Check)
query CurrentUser {
  userQuery {
    current {
      ...UserFields
    }
  }
}
```

### Fragments

```graphql
fragment UserFields on User {
  id
  email
  firstName
  lastName
  avatar
  locale
  isAdmin
  emailVerified
  createdAt
  updatedAt
}

fragment AuthTokenFields on AuthTokenPayload {
  accessToken
  refreshToken
  expiresIn
}

fragment UserErrorFields on GenericUserError {
  code
  field
  message
}
```

---

## Appendix D: Token Strategy Details

> **Source**: `services/iam/src/auth/auth.ts` (Better Auth configuration)

### Token Configuration

| Token Type | Expiry | Storage | Purpose |
|------------|--------|---------|---------|
| Access Token (JWT) | 15 minutes | Memory | API requests |
| Refresh Token (Session) | 7 days | HTTP-only cookie | Token refresh |

### JWT Configuration

```typescript
{
  algorithm: 'EdDSA',        // Ed25519 elliptic curve
  issuer: 'shopana-iam',     // JWT_ISSUER env var
  audience: 'shopana-api',   // JWT_AUDIENCE env var
  keyRotation: 30,           // Days before key rotation
  gracePeriod: 7,            // Days old keys remain valid
}
```

### JWT Payload Structure

```typescript
{
  sub: string;      // User ID
  email: string;    // User email
  name: string;     // User display name
  org?: string;     // Organization ID (when switching orgs)
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
}
```

### Session Configuration

```typescript
{
  expiresIn: 60 * 60 * 24 * 7,  // 7 days in seconds
  updateAge: 60 * 60 * 24,      // Refresh after 1 day of activity
}
```

### Rate Limiting

```typescript
{
  enabled: true,
  window: 60,    // 60 seconds
  max: 100,      // 100 requests per window
}
```

### Password Requirements

```typescript
{
  minLength: 8,
  maxLength: 128,
  requireEmailVerification: false,  // Disabled, waiting for email service
}
```

---

*Document Version: 1.2*
*Last Updated: January 2026*
*Scope: Authentication & Session Management*
*Author: Senior Staff Engineer*
