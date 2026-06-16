/**
 * Metadata key for storing action name on methods
 */
export const ACTION_METADATA_KEY = Symbol("broker:action");

/**
 * Interface for action metadata stored on methods
 */
export interface ActionDecoratorMetadata {
  actionName: string;
}

/**
 * Method decorator that marks a method as a broker action.
 * Used with BrokerActions base class for automatic registration.
 *
 * Use together with @ZodSchema decorator for payload validation.
 *
 * @param actionName - Name of the action (will be prefixed with service name)
 *
 * @example
 * class IamActions extends BrokerActions {
 *   @Action("getCurrentUser")
 *   @ZodSchema(getCurrentUserSchema)
 *   async getCurrentUser(params: GetCurrentUserParams): Promise<GetCurrentUserResult> {
 *     // ...
 *   }
 * }
 */
export function Action(actionName: string): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Store action metadata
    Reflect.defineMetadata(
      ACTION_METADATA_KEY,
      { actionName } as ActionDecoratorMetadata,
      target,
      propertyKey
    );

    return descriptor;
  };
}
