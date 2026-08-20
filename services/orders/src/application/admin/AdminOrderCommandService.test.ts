import { describe, expect, test } from "@jest/globals";
import {
  adminOrderCommandNames,
  type AdminOrderCommandInput,
  type AdminOrderCommandName,
  type AdminOrderCommandResult,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import { AdminOrderCommandService } from "./AdminOrderCommandService.js";
import { adminOrderRequestDigest } from "./AdminOrderCommandIdempotency.js";

const commandHandler: Record<AdminOrderCommandName, string> = {
  orderCreate: "draft.createDraft",
  orderUpdate: "draft.updateDraftDetails",
  orderDelete: "draft.deleteDraft",
  orderCompleteDraft: "draft.completeDraft",
  orderCancel: "integration.prepareOperation",
  orderClose: "draft.transition",
  orderReopen: "draft.transition",
  orderArchive: "draft.archive",
  orderUnarchive: "draft.archive",
  orderCustomerSet: "draft.setCustomer",
  orderTagsUpdate: "draft.updateTags",
  orderAdminNoteUpdate: "draft.updateAdminNote",
  orderCommentAdd: "draft.addComment",
  orderCustomFieldsUpdate: "draft.updateCustomFields",
  orderLineAdd: "draft.addDraftLine",
  orderLineUpdate: "draft.updateDraftLine",
  orderLineDelete: "draft.deleteDraftLine",
  orderEditBegin: "edit.beginEdit",
  orderEditLineAdd: "edit.appendEditChange",
  orderEditLineUpdate: "edit.appendEditChange",
  orderEditLineRemove: "edit.appendEditChange",
  orderEditShippingUpdate: "edit.appendEditChange",
  orderEditDiscountAdd: "edit.appendEditChange",
  orderEditDiscountRemove: "edit.appendEditChange",
  orderEditCommit: "edit.commitEdit",
  orderEditAbandon: "edit.abandonEdit",
  orderManualPaymentRecord: "payment.recordManualPayment",
  orderPaymentCapture: "integration.prepareOperation",
  orderPaymentVoid: "integration.prepareOperation",
  orderPaymentRetry: "integration.prepareOperation",
  orderRefundCreate: "integration.prepareOperation",
  orderPaymentStatusOverride: "payment.overridePaymentStatus",
  fulfillmentOrderSplit: "fulfillment.splitFulfillmentOrder",
  fulfillmentOrderMove: "fulfillment.moveFulfillmentOrder",
  fulfillmentOrderHold: "fulfillment.holdFulfillmentOrder",
  fulfillmentOrderReleaseHold: "fulfillment.releaseFulfillmentHold",
  fulfillmentOrderSubmit: "integration.prepareOperation",
  fulfillmentOrderCancelRequest: "integration.prepareOperation",
  fulfillmentCreate: "fulfillment.createFulfillment",
  fulfillmentCancel: "integration.prepareOperation",
  shipmentCreate: "integration.prepareOperation",
  shipmentTrackingUpdate: "fulfillment.updateShipmentTracking",
  shipmentMarkShipped: "fulfillment.markShipment",
  shipmentMarkDelivered: "fulfillment.markShipment",
  shipmentCancel: "integration.prepareOperation",
  shipmentReconcile: "integration.prepareOperation",
  orderReturnCreate: "returns.createReturn",
  orderReturnApprove: "returns.transitionReturn",
  orderReturnReject: "returns.transitionReturn",
  orderReturnCancel: "returns.transitionReturn",
  orderReturnReceive: "integration.prepareOperation",
  orderExchangeCreate: "returns.createExchange",
  orderExchangeCancel: "returns.cancelExchange",
  orderIntegrationSyncRequest: "integration.prepareOperation",
  orderIntegrationSyncRetry: "integration.prepareOperation",
  orderIntegrationLinkDetach: "integration.detachIntegration",
  ordersBulkAction: "integration.prepareOperation",
};

const input: AdminOrderCommandInput = {
  context: {
    organizationId: "018f3f8d-0e6d-7a74-8f80-123456789abc",
    storeId: "018f3f8d-0e6d-7a74-8f80-123456789abd",
    actor: { type: "STAFF", id: "018f3f8d-0e6d-7a74-8f80-123456789abe" },
    correlationId: "correlation-1",
  },
  input: { idempotencyKey: "command-1" },
};

describe("AdminOrderCommandService", () => {
  test("dispatches every command to its declared capability", async () => {
    expect(Object.keys(commandHandler)).toEqual([...adminOrderCommandNames]);

    for (const command of adminOrderCommandNames) {
      const calls: string[] = [];
      const capability = (name: string) =>
        new Proxy(
          {},
          {
            get: (_target, method) => async () => {
              calls.push(`${name}.${String(method)}`);
              return {
                orderId: null,
                orderVersion: null,
                resourceId: null,
                operationId: null,
              };
            },
          },
        );
      const persistence = {
        draft: capability("draft"),
        edit: capability("edit"),
        payment: capability("payment"),
        fulfillment: capability("fulfillment"),
        returns: capability("returns"),
        integration: capability("integration"),
        operation: {
          findReplay: async () => null,
          saveReplay: async () => undefined,
        },
      };

      const commandInput =
        command === "ordersBulkAction"
          ? {
              ...input,
              input: {
                ...input.input,
                selection: { ids: [input.context.storeId] },
              },
            }
          : input;
      await new AdminOrderCommandService(persistence as never).execute(
        command,
        commandInput,
        "workflow-1",
      );

      expect(calls).toEqual([commandHandler[command]]);
    }
  });

  test("returns an idempotent replay without dispatching a mutation", async () => {
    const replay: AdminOrderCommandResult = {
      command: "orderArchive",
      orderId: null,
      orderVersion: 2,
      resourceId: null,
      operationId: null,
      duplicate: false,
      deleted: false,
    };
    const requestHash = adminOrderRequestDigest({ command: "orderArchive", input: input.input });
    const persistence = {
      operation: {
        findReplay: async () => ({ requestHash, response: replay }),
        saveReplay: async () => undefined,
      },
    };
    const service = new AdminOrderCommandService(persistence as never);

    await expect(service.execute("orderArchive", input, "workflow-1")).resolves.toEqual({
      ...replay,
      duplicate: true,
    });
  });

  test("rejects reuse of an idempotency key with different parameters", async () => {
    const persistence = {
      operation: {
        findReplay: async () => ({
          requestHash: "different-request",
          response: {} as AdminOrderCommandResult,
        }),
        saveReplay: async () => undefined,
      },
    };

    await expect(
      new AdminOrderCommandService(persistence as never).execute(
        "orderArchive",
        input,
        "workflow-1",
      ),
    ).rejects.toThrow("IDEMPOTENCY_KEY_PARAMETER_MISMATCH");
  });

  test("rejects an ineffective bulk filter before touching persistence", async () => {
    let persistenceCalled = false;
    const persistence = {
      operation: {
        findReplay: async () => {
          persistenceCalled = true;
          return null;
        },
      },
    };

    await expect(
      new AdminOrderCommandService(persistence as never).execute(
        "ordersBulkAction",
        {
          ...input,
          input: {
            idempotencyKey: "bulk-1",
            selection: { where: { status: {} } },
          },
        },
        "workflow-1",
      ),
    ).rejects.toThrow("ORDER_BULK_FILTER_EMPTY");
    expect(persistenceCalled).toBe(false);
  });
});
