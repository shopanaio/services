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

// Storefront API use cases
export { GetUserOrdersUseCase } from "./orderGetByCustomerId";

// Types from order module

// Use case input/output types
export type { GetOrderByIdInput } from "./orderGetById";
export type { GetOrdersInput, GetOrdersUseCaseInput, GetOrdersOutput } from "./orderGetMany";
export type { GetUserOrdersInput, GetUserOrdersUseCaseInput } from "./orderGetByCustomerId";

// DTOs
