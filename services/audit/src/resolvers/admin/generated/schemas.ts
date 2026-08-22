import { z } from 'zod'
import { AuditAction, AuditActorType, AuditChangeKind, AuditEntryWhereInput, AuditOperationAction, AuditValueState } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const AuditActionSchema = z.nativeEnum(AuditAction);

export const AuditActorTypeSchema = z.nativeEnum(AuditActorType);

export const AuditChangeKindSchema = z.nativeEnum(AuditChangeKind);

export const AuditOperationActionSchema = z.nativeEnum(AuditOperationAction);

export const AuditValueStateSchema = z.nativeEnum(AuditValueState);

export function AuditEntryWhereInputSchema(): z.ZodObject<Properties<AuditEntryWhereInput>> {
  return z.object({
    actions: z.array(AuditActionSchema).nullish(),
    actorId: z.string().nullish(),
    aggregateId: z.string().nullish(),
    commands: z.array(z.string()).nullish(),
    occurredFrom: z.string().nullish(),
    occurredTo: z.string().nullish(),
    targetId: z.string().nullish()
  })
}
