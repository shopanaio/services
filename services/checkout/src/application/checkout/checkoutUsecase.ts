import type { Logger } from "pino";

import { AddCheckoutLinesUseCase } from "@src/application/usecases/addCheckoutLinesUseCase";
import { AddDeliveryAddressUseCase } from "@src/application/usecases/addDeliveryAddressUseCase";
import { AddPromoCodeUseCase } from "@src/application/usecases/addPromoCodeUseCase";
import { ClearCheckoutLinesUseCase } from "@src/application/usecases/clearCheckoutLinesUseCase";
import { CreateCheckoutUseCase } from "@src/application/usecases/createCheckoutUseCase";
import { DeleteCheckoutLinesUseCase } from "@src/application/usecases/removeCheckoutLinesUseCase";
import { RemoveDeliveryAddressUseCase } from "@src/application/usecases/removeDeliveryAddressUseCase";
import { RemovePromoCodeUseCase } from "@src/application/usecases/removePromoCodeUseCase";
import { UpdateCheckoutLinesUseCase } from "@src/application/usecases/updateCheckoutLinesUseCase";
import { UpdateCurrencyCodeUseCase } from "@src/application/usecases/updateCurrencyCodeUseCase";
import { UpdateCustomerIdentityUseCase } from "@src/application/usecases/updateCustomerIdentityUseCase";
import { UpdateCustomerNoteUseCase } from "@src/application/usecases/updateCustomerNoteUseCase";
import { UpdateDeliveryAddressUseCase } from "@src/application/usecases/updateDeliveryAddressUseCase";
import { UpdateDeliveryGroupMethodUseCase } from "@src/application/usecases/updateDeliveryGroupMethodUseCase";
import { UpdateLanguageCodeUseCase } from "@src/application/usecases/updateLanguageCodeUseCase";
import { UpdatePaymentMethodUseCase } from "@src/application/usecases/updatePaymentMethodUseCase";
import { ReplaceCheckoutLinesUseCase } from "@src/application/usecases/replaceCheckoutLinesUseCase";
import { UpdateDeliveryGroupRecipientUseCase } from "@src/application/usecases/updateDeliveryGroupRecipientUseCase";
import { RemoveDeliveryGroupRecipientUseCase } from "@src/application/usecases/removeDeliveryGroupRecipientUseCase";
import { CreateCheckoutTagUseCase } from "@src/application/usecases/createCheckoutTagUseCase";
import { UpdateCheckoutTagUseCase } from "@src/application/usecases/updateCheckoutTagUseCase";
import { DeleteCheckoutTagUseCase } from "@src/application/usecases/deleteCheckoutTagUseCase";
import { GetCheckoutDtoByIdUseCase } from "@src/application/usecases/getCheckoutDtoByIdUseCase";
import { GetCheckoutCompletionUseCase } from "@src/application/usecases/getCheckoutCompletionUseCase";
import type {
  CheckoutMutationCoordinator,
  CheckoutMutationSnapshotPort,
} from "@src/application/mutations/index.js";

export class CheckoutUsecase {
  // Checkout use cases
  public readonly createCheckout: CreateCheckoutUseCase;
  public readonly getCheckoutDtoById: GetCheckoutDtoByIdUseCase;
  public readonly getCheckoutCompletion: GetCheckoutCompletionUseCase;

  // Lines use cases
  public readonly addCheckoutLines: AddCheckoutLinesUseCase;
  public readonly updateCheckoutLines: UpdateCheckoutLinesUseCase;
  public readonly deleteCheckoutLines: DeleteCheckoutLinesUseCase;
  public readonly clearCheckoutLines: ClearCheckoutLinesUseCase;
  public readonly updateCustomerIdentity: UpdateCustomerIdentityUseCase;
  public readonly updateCustomerNote: UpdateCustomerNoteUseCase;
  public readonly updateLanguageCode: UpdateLanguageCodeUseCase;
  public readonly updateCurrencyCode: UpdateCurrencyCodeUseCase;
  public readonly updatePaymentMethod: UpdatePaymentMethodUseCase;
  public readonly addPromoCode: AddPromoCodeUseCase;
  public readonly removePromoCode: RemovePromoCodeUseCase;
  public readonly updateDeliveryGroupMethod: UpdateDeliveryGroupMethodUseCase;
  public readonly addDeliveryAddress: AddDeliveryAddressUseCase;
  public readonly updateDeliveryAddress: UpdateDeliveryAddressUseCase;
  public readonly removeDeliveryAddress: RemoveDeliveryAddressUseCase;
  public readonly updateDeliveryGroupRecipient: UpdateDeliveryGroupRecipientUseCase;
  public readonly removeDeliveryGroupRecipient: RemoveDeliveryGroupRecipientUseCase;
  public readonly replaceCheckoutLines: ReplaceCheckoutLinesUseCase;
  public readonly createCheckoutTag: CreateCheckoutTagUseCase;
  public readonly updateCheckoutTag: UpdateCheckoutTagUseCase;
  public readonly deleteCheckoutTag: DeleteCheckoutTagUseCase;

  constructor(deps: {
    logger?: Logger;
    checkoutMutationSnapshots: CheckoutMutationSnapshotPort;
    checkoutMutationCoordinator: CheckoutMutationCoordinator;
  }) {
    const baseDeps = {
      logger: deps.logger,
      checkoutMutationCoordinator: deps.checkoutMutationCoordinator,
    };

    // Initialize checkout use cases
    this.createCheckout = new CreateCheckoutUseCase({
      ...baseDeps,
    });

    this.getCheckoutDtoById = new GetCheckoutDtoByIdUseCase(
      deps.checkoutMutationSnapshots,
    );
    this.getCheckoutCompletion = new GetCheckoutCompletionUseCase(
      deps.checkoutMutationSnapshots,
    );

    // Initialize lines use cases
    this.addCheckoutLines = new AddCheckoutLinesUseCase(baseDeps);
    this.updateCheckoutLines = new UpdateCheckoutLinesUseCase(baseDeps);
    this.deleteCheckoutLines = new DeleteCheckoutLinesUseCase(baseDeps);
    this.clearCheckoutLines = new ClearCheckoutLinesUseCase(baseDeps);
    this.replaceCheckoutLines = new ReplaceCheckoutLinesUseCase(baseDeps);

    // Initialize customer use cases
    this.updateCustomerIdentity = new UpdateCustomerIdentityUseCase(baseDeps);
    this.updateCustomerNote = new UpdateCustomerNoteUseCase(baseDeps);
    this.updateLanguageCode = new UpdateLanguageCodeUseCase(baseDeps);
    this.updateCurrencyCode = new UpdateCurrencyCodeUseCase(baseDeps);
    this.updatePaymentMethod = new UpdatePaymentMethodUseCase(baseDeps);

    // Initialize promo use cases
    this.addPromoCode = new AddPromoCodeUseCase(baseDeps);
    this.removePromoCode = new RemovePromoCodeUseCase(baseDeps);

    // Initialize delivery use cases
    this.updateDeliveryGroupMethod = new UpdateDeliveryGroupMethodUseCase(
      baseDeps
    );
    this.addDeliveryAddress = new AddDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryAddress = new UpdateDeliveryAddressUseCase(baseDeps);
    this.removeDeliveryAddress = new RemoveDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryGroupRecipient = new UpdateDeliveryGroupRecipientUseCase(
      baseDeps
    );
    this.removeDeliveryGroupRecipient = new RemoveDeliveryGroupRecipientUseCase(
      baseDeps
    );
    this.createCheckoutTag = new CreateCheckoutTagUseCase(baseDeps);
    this.updateCheckoutTag = new UpdateCheckoutTagUseCase(baseDeps);
    this.deleteCheckoutTag = new DeleteCheckoutTagUseCase(baseDeps);
  }
}
