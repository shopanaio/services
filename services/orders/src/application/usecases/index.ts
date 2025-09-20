// UseCases module: re-exports application use-cases

// Base UseCase
export { UseCase } from "./useCase";
export type { UseCaseDependencies } from "./useCase";

// Order Usecase (collection of all use cases)
export { OrderUsecase } from "../order/orderUsecase";

// Order use cases
export { CreateOrderUseCase } from "./orderCreate";
export { GetOrderByIdUseCase } from "./orderGetById";

// Admin API use cases
export { GetOrdersUseCase } from "./orderGetMany";
export { UpdateOrderAdminNoteUseCase } from "./orderAdminNoteUpdate";
export { AddOrderCommentUseCase } from "./orderCommentAdd";
export { CancelOrderUseCase } from "./orderCancel";
export { CloseOrderUseCase } from "./orderClose";

// Storefront API use cases
export { GetUserOrdersUseCase } from "./orderGetByCustomerId";

// Types from order module
export type { CreateOrderInput } from "@src/application/order/types";

// Use case input/output types
export type {
  GetOrderByIdInput
} from "./orderGetById";
export type {
  GetOrdersInput,
  GetOrdersUseCaseInput,
  GetOrdersOutput
} from "./orderGetMany";
export type {
  UpdateOrderAdminNoteInput,
  UpdateOrderAdminNoteUseCaseInput
} from "./orderAdminNoteUpdate";
export type {
  AddOrderCommentInput,
  AddOrderCommentUseCaseInput
} from "./orderCommentAdd";
export type {
  CancelOrderInput,
  CancelOrderUseCaseInput
} from "./orderCancel";
export type {
  CloseOrderInput,
  CloseOrderUseCaseInput
} from "./orderClose";
export type {
  GetUserOrdersInput,
  GetUserOrdersUseCaseInput
} from "./orderGetByCustomerId";

// DTOs
export { CreateOrderDto } from "@src/application/dto/createOrder.dto";
