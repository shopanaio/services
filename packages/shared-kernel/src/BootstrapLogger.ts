import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * Filtered NestJS logger for cleaner bootstrap output.
 * Shows only errors, warnings, and critical startup messages.
 */
export class BootstrapLogger extends ConsoleLogger {
  private static readonly FILTERED_CONTEXTS = new Set([
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestFactory',
    'ServiceBroker',
    'WorkflowModule',
  ]);

  private static readonly FILTERED_MESSAGES = [
    'service started',
    'service stopped',
    'registered action',
    'registered actions',
    'onmoduleinit',
  ];

  constructor() {
    super();
    // Only show error, warn, and log (no debug/verbose)
    this.setLogLevels(['error', 'warn', 'log']);
  }

  protected printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
  ): void {
    // Filter out noisy contexts
    if (context && logLevel === 'log' && BootstrapLogger.FILTERED_CONTEXTS.has(context)) {
      return;
    }

    // Filter out noisy messages
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
