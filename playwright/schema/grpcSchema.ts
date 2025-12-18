import * as Yup from 'yup';

/**
 * Validation schema for gRPC Context response
 */
export const grpcContextSchema = Yup.object({
  project: Yup.object()
    .shape({
      id: Yup.string().required(),
      name: Yup.string().required(),
      locale: Yup.string().required(),
      currency: Yup.string().required(),
      timezone: Yup.string().required(),
      email: Yup.string().email().required(),
      phoneNumber: Yup.string().required(),
      country: Yup.string().required(),
      locales: Yup.array()
        .of(
          Yup.object().shape({
            code: Yup.string().required(),
            isActive: Yup.boolean().required(),
          }),
        )
        .min(1)
        .required(),
      currencies: Yup.array()
        .of(
          Yup.object().shape({
            code: Yup.string().required(),
            isActive: Yup.boolean().required(),
            exchangeRate: Yup.number().positive().required(),
          }),
        )
        .min(1)
        .required(),
      stockStatuses: Yup.array()
        .of(
          Yup.object().shape({
            code: Yup.string().required(),
          }),
        )
        .required(),
    })
    .required(),
  tenant: Yup.object()
    .shape({
      id: Yup.string().required(),
      tenantId: Yup.string().required(),
      email: Yup.string().email().required(),
      firstName: Yup.string().required(),
      lastName: Yup.string().required(),
      isReady: Yup.boolean().required(),
      isVerified: Yup.boolean().required(),
      language: Yup.string().required(),
      phoneNumber: Yup.string().nullable(),
      timezone: Yup.string().required(),
      createdAt: Yup.string().required(),
      updatedAt: Yup.string().required(),
    })
    .nullable(),
  customer: Yup.object()
    .shape({
      id: Yup.string().required(),
      email: Yup.string().email().required(),
      firstName: Yup.string().required(),
      lastName: Yup.string().required(),
      phone: Yup.string().nullable(),
      isBlocked: Yup.boolean().required(),
      isVerified: Yup.boolean().required(),
      language: Yup.string().nullable(),
      createdAt: Yup.string().required(),
      updatedAt: Yup.string().required(),
    })
    .nullable(),
});

/**
 * Validation schema for gRPC Project
 */
export const grpcProjectSchema = Yup.object({
  id: Yup.string().required(),
  name: Yup.string().required(),
  locale: Yup.string().required(),
  currency: Yup.string().required(),
  timezone: Yup.string().required(),
  email: Yup.string().email().required(),
  phoneNumber: Yup.string().required(),
  country: Yup.string().required(),
  locales: Yup.array()
    .of(
      Yup.object().shape({
        code: Yup.string().required(),
        isActive: Yup.boolean().required(),
      }),
    )
    .min(1)
    .required(),
  currencies: Yup.array()
    .of(
      Yup.object().shape({
        code: Yup.string().required(),
        isActive: Yup.boolean().required(),
        exchangeRate: Yup.number().positive().required(),
      }),
    )
    .min(1)
    .required(),
  stockStatuses: Yup.array()
    .of(
      Yup.object().shape({
        code: Yup.string().required(),
      }),
    )
    .required(),
});

/**
 * Validation schema for gRPC User (Tenant)
 */
export const grpcUserSchema = Yup.object({
  id: Yup.string().required(),
  tenantId: Yup.string().required(),
  email: Yup.string().email().required(),
  firstName: Yup.string().required(),
  lastName: Yup.string().required(),
  isReady: Yup.boolean().required(),
  isVerified: Yup.boolean().required(),
  language: Yup.string().required(),
  phoneNumber: Yup.string().nullable(),
  timezone: Yup.string().required(),
  createdAt: Yup.string().required(),
  updatedAt: Yup.string().required(),
});

/**
 * Validation schema for gRPC Customer
 */
export const grpcCustomerSchema = Yup.object({
  id: Yup.string().required(),
  email: Yup.string().email().required(),
  firstName: Yup.string().required(),
  lastName: Yup.string().required(),
  phone: Yup.string().nullable(),
  isBlocked: Yup.boolean().required(),
  isVerified: Yup.boolean().required(),
  language: Yup.string().nullable(),
  createdAt: Yup.string().required(),
  updatedAt: Yup.string().required(),
});
