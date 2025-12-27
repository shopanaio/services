type Extractor<TRef, TValue> = (ref: TRef) => TValue;

type RefWithId = { id: string; __typename?: string };

/**
 * Декоратор класса, который добавляет __resolveReference в прототип.
 * Используется для Apollo Federation entity resolution.
 *
 * @param extractor - функция извлечения значения из federation reference (по умолчанию ref.id)
 *
 * @example
 * ```typescript
 * // Простой случай - извлечение по id (по умолчанию)
 * @SubgraphReference()
 * export class UserResolver extends IAMType<string, User | null> { ... }
 *
 * // Составной ключ
 * @SubgraphReference((ref) => ({ domain: ref.domain, organizationId: ref.organizationId }))
 * export class MembershipResolver extends IAMType<MembershipInput, ...> { ... }
 * ```
 */
export function SubgraphReference(): <T extends new (...args: any[]) => any>(
  TargetClass: T
) => T;
export function SubgraphReference<TRef, TValue>(
  extractor: Extractor<TRef, TValue>
): <T extends new (...args: any[]) => any>(TargetClass: T) => T;
export function SubgraphReference<TRef = RefWithId, TValue = string>(
  extractor?: Extractor<TRef, TValue>
) {
  const extract = extractor ?? ((ref: RefWithId) => ref.id);

  return function <T extends new (...args: any[]) => any>(TargetClass: T) {
    // Добавляем __resolveReference в прототип — будет доступен на каждом инстансе
    TargetClass.prototype.__resolveReference = function (ref: TRef, ctx: any) {
      const value = extract(ref as any);
      return new TargetClass(value, ctx);
    };

    return TargetClass;
  };
}
