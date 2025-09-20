// UseCases module: re-exports application use-cases

// Base UseCase
export { UseCase } from "./useCase";
export type { UseCaseDependencies } from "./useCase";

// Order Usecase (collection of all use cases)
export { OrderUsecase } from "../order/orderUsecase";

// Order use cases
export { CreateOrderUseCase } from "./createOrderUseCase";
export { GetOrderByIdUseCase } from "./getOrderByIdUseCase";

// Types from order module
export type { CreateOrderInput } from "@src/application/order/types";

// DTOs
export { CreateOrderDto } from "@src/application/dto/createOrder.dto";
