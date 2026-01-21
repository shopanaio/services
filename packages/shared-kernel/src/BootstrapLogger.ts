import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * Filtered NestJS logger for cleaner bootstrap output.
 * Filters out noisy logs like InstanceLoader, RoutesResolver, etc.
 * Shows only errors, warnings, and important startup messages.
 */
export class BootstrapLogger extends ConsoleLogger {
  private static readonly FILTERED_CONTEXTS = new Set([
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestFactory',
  ]);

  private static readonly FILTERED_MESSAGES = [
    'service started',
    'service stopped',
  ];

  protected printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
  ): void {
    // Filter out noisy contexts for log level
    if (context && logLevel === 'log' && BootstrapLogger.FILTERED_CONTEXTS.has(context)) {
      return;
    }

    // Filter out service started/stopped messages
    if (logLevel === 'log') {
      const msg = messages[0];
      if (typeof msg === 'string') {
        const msgLower = msg.toLowerCase();
        if (BootstrapLogger.FILTERED_MESSAGES.some(f => msgLower.includes(f))) {
          return;
        }
      }
    }

    super.printMessages(messages, context, logLevel, writeStreamType);
  }
}
