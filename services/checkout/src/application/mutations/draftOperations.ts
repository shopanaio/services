import { canonicalJson } from "../pipeline/canonicalJson.js";
import type {
  CheckoutCartLineIntent,
  CheckoutPipelineJsonObject,
} from "../pipeline/contracts/index.js";
import type {
  CheckoutLineCommand,
} from "../checkout/types.js";
import type {
  CheckoutCommittedSnapshot,
  CheckoutMutationDraft,
} from "./contracts.js";
import { CheckoutMutationError } from "./contracts.js";

export function addLines(
  draft: CheckoutMutationDraft,
  commands: readonly CheckoutLineCommand[],
): void {
  const lines = [...draft.cartIntent.lines];
  const assignments = [...draft.lineTagAssignments];
  for (const command of commands) {
    const candidate = toIntent(command);
    const existing = lines.find((line) => sameLineIntent(line, candidate));
    const lineId = existing?.lineId ?? candidate.lineId;
    if (existing) {
      const index = lines.indexOf(existing);
      lines[index] = { ...existing, quantity: existing.quantity + command.quantity };
    } else {
      lines.push(candidate);
    }
    if (command.tagSlug) {
      const tag = draft.tags.find(({ slug }) => slug === command.tagSlug);
      if (!tag) throw invalid("CHECKOUT_TAG_NOT_FOUND", "Checkout tag was not found.");
      if (
        tag.isUnique &&
        assignments.some(
          (assignment) => assignment.tagId === tag.id && assignment.lineId !== lineId,
        )
      ) {
        throw invalid(
          "CHECKOUT_TAG_UNIQUENESS_CONFLICT",
          "A unique checkout tag cannot be assigned to multiple lines.",
        );
      }
      const withoutLine = assignments.filter((assignment) => assignment.lineId !== lineId);
      withoutLine.push({ lineId, tagId: tag.id });
      assignments.splice(0, assignments.length, ...withoutLine);
    }
  }
  draft.cartIntent = { ...draft.cartIntent, lines };
  draft.lineTagAssignments = assignments;
}

export function updateLineQuantities(
  draft: CheckoutMutationDraft,
  updates: readonly { lineId: string; quantity: number }[],
): void {
  assertUniqueIds(updates.map(({ lineId }) => lineId), "checkout line");
  const updateById = new Map(updates.map((update) => [update.lineId, update.quantity]));
  const known = new Set(draft.cartIntent.lines.map(({ lineId }) => lineId));
  for (const { lineId, quantity } of updates) {
    if (!known.has(lineId)) throw invalid("CHECKOUT_LINE_NOT_FOUND", "Checkout line was not found.");
    if (quantity < 0) throw invalid("CHECKOUT_LINE_QUANTITY_INVALID", "Checkout line quantity cannot be negative.");
  }
  const removed = new Set<string>();
  const map = (lines: readonly CheckoutCartLineIntent[]): CheckoutCartLineIntent[] =>
    lines.flatMap((line) => {
      const quantity = updateById.get(line.lineId);
      if (quantity === 0) {
        for (const nested of flattenLines([line])) removed.add(nested.lineId);
        return [];
      }
      return [{
        ...line,
        ...(quantity === undefined ? {} : { quantity }),
        children: line.children,
      }];
    });
  draft.cartIntent = {
    ...draft.cartIntent,
    lines: map(draft.cartIntent.lines),
    destinations: draft.cartIntent.destinations.map((destination) => ({
      ...destination,
      lineIds: destination.lineIds.filter((lineId) => !removed.has(lineId)),
    })),
  };
  draft.lineTagAssignments = draft.lineTagAssignments.filter(
    ({ lineId }) => !removed.has(lineId),
  );
}

export function deleteLines(
  draft: CheckoutMutationDraft,
  lineIds: readonly string[],
): void {
  updateLineQuantities(
    draft,
    lineIds.map((lineId) => ({ lineId, quantity: 0 })),
  );
}

export function clearLines(draft: CheckoutMutationDraft): void {
  draft.cartIntent = {
    ...draft.cartIntent,
    lines: [],
    destinations: draft.cartIntent.destinations.map((destination) => ({
      ...destination,
      lineIds: [],
    })),
    selectedDeliveryOptions: [],
    selectedPaymentMethod: null,
  };
  draft.lineTagAssignments = [];
}

export function replaceLines(
  draft: CheckoutMutationDraft,
  replacements: readonly { lineId: string; variantId: string; quantity?: number }[],
): void {
  assertUniqueIds(replacements.map(({ lineId }) => lineId), "checkout line");
  const byId = new Map(replacements.map((replacement) => [replacement.lineId, replacement]));
  const found = new Set<string>();
  const map = (lines: readonly CheckoutCartLineIntent[]): CheckoutCartLineIntent[] =>
    lines.map((line) => {
      const replacement = byId.get(line.lineId);
      if (!replacement) return { ...line, children: map(line.children) };
      found.add(line.lineId);
      if (replacement.quantity !== undefined && replacement.quantity <= 0) {
        throw invalid("CHECKOUT_LINE_QUANTITY_INVALID", "Replacement quantity must be positive.");
      }
      return {
        ...line,
        variantId: replacement.variantId,
        ...(replacement.quantity === undefined ? {} : { quantity: replacement.quantity }),
        children: map(line.children),
      };
    });
  draft.cartIntent = { ...draft.cartIntent, lines: map(draft.cartIntent.lines) };
  for (const { lineId } of replacements) {
    if (!found.has(lineId)) throw invalid("CHECKOUT_LINE_NOT_FOUND", "Checkout line was not found.");
  }
}

export function updateDeliverySelection(
  draft: CheckoutMutationDraft,
  input: { groupId: string; optionHandle: string; customerInput: CheckoutPipelineJsonObject | null },
): void {
  const others = draft.cartIntent.selectedDeliveryOptions.filter(
    ({ groupId }) => groupId !== input.groupId,
  );
  draft.cartIntent = {
    ...draft.cartIntent,
    selectedDeliveryOptions: [
      ...others,
      {
        groupId: input.groupId,
        optionHandle: boundedHandle(input.optionHandle),
        customerInput: input.customerInput,
      },
    ],
  };
}

export function updatePaymentSelection(
  draft: CheckoutMutationDraft,
  input: { methodHandle: string; customerInput: CheckoutPipelineJsonObject | null },
): void {
  draft.cartIntent = {
    ...draft.cartIntent,
    selectedPaymentMethod: {
      methodHandle: boundedHandle(input.methodHandle),
      customerInput: input.customerInput,
    },
  };
}

export function destinationIdForGroup(
  current: CheckoutCommittedSnapshot,
  groupId: string,
): string {
  if (current.result.delivery.status !== "SUCCESS") {
    throw invalid("CHECKOUT_DELIVERY_UNAVAILABLE", "Checkout delivery snapshot is unavailable.");
  }
  const group = current.result.delivery.data.groups.find((item) => item.groupId === groupId);
  if (!group) throw invalid("CHECKOUT_DELIVERY_GROUP_NOT_FOUND", "Checkout delivery group was not found.");
  return group.destinationId;
}

export function normalizeDiscountCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!code || code.length > 256) throw invalid("CHECKOUT_DISCOUNT_CODE_INVALID", "Discount code is invalid.");
  return code;
}

function boundedHandle(value: string): string {
  const handle = value.trim();
  if (!handle || handle.length > 256) throw invalid("CHECKOUT_SELECTION_HANDLE_INVALID", "Checkout selection handle is invalid.");
  return handle;
}

function toIntent(command: CheckoutLineCommand): CheckoutCartLineIntent {
  return {
    lineId: command.lineId,
    variantId: command.variantId,
    componentSelection: null,
    quantity: command.quantity,
    purchase: command.purchase,
    attributes: command.attributes,
    children: (command.children ?? []).map((child) => ({
      lineId: child.lineId,
      variantId: child.variantId,
      componentSelection: { componentItemId: child.componentItemId },
      quantity: child.quantity,
      purchase: child.purchase,
      attributes: child.attributes,
      children: [],
    })),
  };
}

function sameLineIntent(a: CheckoutCartLineIntent, b: CheckoutCartLineIntent): boolean {
  const withoutIdentity = (
    line: CheckoutCartLineIntent,
    includeQuantity: boolean,
  ): unknown => ({
    variantId: line.variantId,
    componentSelection: line.componentSelection,
    ...(includeQuantity ? { quantity: line.quantity } : {}),
    purchase: line.purchase,
    attributes: line.attributes,
    children: line.children.map((child) => withoutIdentity(child, true)),
  });
  return canonicalJson(withoutIdentity(a, false)) === canonicalJson(withoutIdentity(b, false));
}

export function flattenLines(
  lines: readonly CheckoutCartLineIntent[],
): CheckoutCartLineIntent[] {
  return lines.flatMap((line) => [line, ...flattenLines(line.children)]);
}

export function assertUniqueIds(ids: readonly string[], resource: string): void {
  if (new Set(ids).size !== ids.length) {
    throw invalid(
      "CHECKOUT_BATCH_DUPLICATE_ID",
      `A ${resource} identifier may only occur once in a batch.`,
    );
  }
}

function invalid(code: string, message: string): CheckoutMutationError {
  return new CheckoutMutationError(code, message, false);
}
