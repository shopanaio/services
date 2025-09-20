import { plainToInstance, type ClassTransformOptions } from 'class-transformer';
import {
  type ValidationError,
  type ValidatorOptions,
  validateSync,
} from 'class-validator';

type ClassConstructor<T> = new (...args: unknown[]) => T;

export type ValidationFactoryOptions = {
  transform?: ClassTransformOptions;
  validate?: ValidatorOptions;
};

const defaultTransformOptions: ClassTransformOptions = {
  enableImplicitConversion: true,
};

const defaultValidateOptions: ValidatorOptions = {
  whitelist: true,
  forbidUnknownValues: true,
  forbidNonWhitelisted: false,
};

function formatValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      for (const msg of Object.values(error.constraints)) {
        messages.push(`${path}: ${msg}`);
      }
    }
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children, path));
    }
  }
  return messages;
}

export function createValidated<T>(
  cls: ClassConstructor<T>,
  plain: unknown,
  options?: ValidationFactoryOptions,
): T {
  const transformOptions = { ...defaultTransformOptions, ...(options?.transform ?? {}) };
  const validateOptions = { ...defaultValidateOptions, ...(options?.validate ?? {}) };

  const instance = plainToInstance(cls, plain, transformOptions);
  const errors = validateSync(instance as object, validateOptions);
  if (errors.length > 0) {
    const messages = formatValidationErrors(errors);
    throw new Error(`Validation failed: ${messages.join('; ')}`);
  }
  return instance;
}

export function createValidatedArray<T>(
  cls: ClassConstructor<T>,
  plainArray: unknown,
  options?: ValidationFactoryOptions,
): T[] {
  if (!Array.isArray(plainArray)) {
    throw new Error('Validation failed: expected an array input');
  }
  const transformOptions = { ...defaultTransformOptions, ...(options?.transform ?? {}) };
  const validateOptions = { ...defaultValidateOptions, ...(options?.validate ?? {}) };

  const instances = plainToInstance(cls, plainArray, transformOptions) as T[];
  const allErrors: string[] = [];
  for (let i = 0; i < instances.length; i += 1) {
    const item = instances[i] as object;
    const errors = validateSync(item, validateOptions);
    if (errors.length > 0) {
      const messages = formatValidationErrors(errors, `[${i}]`);
      allErrors.push(...messages);
    }
  }
  if (allErrors.length > 0) {
    throw new Error(`Validation failed: ${allErrors.join('; ')}`);
  }
  return instances;
}
