/**
 * @shopana/kernel
 *
 * Microkernel architecture package for Shopana microservices.
 * Implements Transaction Script pattern with minimal dependencies.
 */

export { Kernel } from './Kernel';
export { MoleculerLogger } from './MoleculerLogger';
export {
  type Logger,
  type BaseKernelServices,
  type KernelServices,
  type TransactionScript,
  type ScriptContext,
  type ScriptResult,
  KernelError,
} from './types';
