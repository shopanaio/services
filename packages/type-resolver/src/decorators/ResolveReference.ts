type Extractor<TRef, TValue> = (ref: TRef) => TValue;

/**
 * Декоратор класса, который добавляет __resolveReference в прототип.
 * Используется для Apollo Federation entity resolution.
 *
 * @param extractor - функция извлечения значения из federation reference
 *
 * @example
 * ```typescript
 * @ResolveReference((ref: { __typename: "User"; id: string }) => ref.id)
 * export class UserResolver extends IAMType<string, User | null> {
 *   async loadData() {
 *     return this.ctx.kernel.repository.user.findById(this.value);
 *   }
 * }
 * ```
 */
export function ResolveReference<TRef, TValue>(
  extractor: Extractor<TRef, TValue>
) {
  return function <T extends new (...args: any[]) => any>(TargetClass: T) {
    // Добавляем __resolveReference в прототип — будет доступен на каждом инстансе
    TargetClass.prototype.__resolveReference = function (ref: TRef, ctx: any) {
      const value = extractor(ref);
      return new TargetClass(value, ctx);
    };

    return TargetClass;
  };
}
