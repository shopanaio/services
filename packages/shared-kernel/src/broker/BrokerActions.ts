import { Logger, OnModuleInit } from "@nestjs/common";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  ACTION_METADATA_KEY,
  type ActionMetadata,
} from "../decorators/Action.js";
import "reflect-metadata";

/**
 * Base class for services that register broker actions.
 * Subclasses can use @Action decorator on methods to automatically register them.
 *
 * @example
 * @Injectable()
 * class IamActions extends BrokerActions {
 *   constructor(@InjectBroker("iam") broker: ServiceBroker) {
 *     super(broker);
 *   }
 *
 *   @Action("getCurrentUser")
 *   @ActionSchema(getCurrentUserSchema)
 *   async getCurrentUser(params: GetCurrentUserParams): Promise<GetCurrentUserResult> {
 *     // Implementation
 *   }
 *
 *   @Action("authorize")
 *   async authorize(params: AuthorizeParams): Promise<AuthorizeResult> {
 *     // Implementation
 *   }
 * }
 */
export abstract class BrokerActions implements OnModuleInit {
  protected readonly logger: Logger;

  constructor(protected readonly broker: ServiceBroker) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Called by NestJS when the module initializes.
   * Scans for @Action decorated methods and registers them with the broker.
   */
  onModuleInit(): void {
    this.registerActions();
  }

  /**
   * Scans the class instance for methods decorated with @Action and registers them.
   */
  private registerActions(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);
    const registeredActions: string[] = [];

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        ACTION_METADATA_KEY,
        prototype,
        methodName
      ) as ActionMetadata | undefined;

      if (metadata) {
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown
        ) => Promise<unknown>;

        // Bind the method to this instance
        const boundMethod = method.bind(this);

        this.broker.register(metadata.actionName, boundMethod);
        registeredActions.push(metadata.actionName);
      }
    }

    if (registeredActions.length > 0) {
      this.logger.debug(`Registered actions: ${registeredActions.join(", ")}`);
    }
  }

  /**
   * Gets all method names from a prototype, excluding constructor.
   */
  private getMethodNames(prototype: object): string[] {
    const methods: string[] = [];
    let currentProto = prototype;

    while (currentProto && currentProto !== Object.prototype) {
      const names = Object.getOwnPropertyNames(currentProto).filter((name) => {
        if (name === "constructor") return false;
        const descriptor = Object.getOwnPropertyDescriptor(currentProto, name);
        return descriptor && typeof descriptor.value === "function";
      });

      methods.push(...names);
      currentProto = Object.getPrototypeOf(currentProto);
    }

    return [...new Set(methods)];
  }
}
