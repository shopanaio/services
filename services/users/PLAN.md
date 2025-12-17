# Рефакторинг Users сервиса на Casdoor Facade

## Overview

Рефакторинг users сервиса для использования Casdoor как IAM backend. Структура как в inventory, но Repository работает с casdoor клиентом вместо БД.

## Структура (как inventory)

```
src/
├── api/
│   └── graphql-admin/
│       ├── contextMiddleware.ts
│       ├── generated/
│       │   └── types.ts
│       ├── resolvers/
│       │   ├── index.ts
│       │   ├── mutations/
│       │   │   ├── user.ts          # Admin user mutations
│       │   │   ├── customer.ts      # Customer mutations
│       │   │   └── auth.ts          # Auth mutations (signUp, signIn, etc.)
│       │   ├── queries.ts
│       │   ├── types.ts
│       │   └── utils.ts
│       ├── schema/
│       │   ├── base.graphql
│       │   ├── relay.graphql
│       │   ├── user.graphql         # Admin user types
│       │   ├── customer.graphql     # Customer types
│       │   └── auth.graphql         # Auth types (SignUpPayload, etc.)
│       └── server.ts
├── config.ts
├── context/
│   ├── contextStorage.ts
│   ├── index.ts
│   └── types.ts
├── repositories/
│   ├── Repository.ts                # агрегатор (как в inventory, но с casdoor клиентом)
│   ├── user/
│   │   └── UserRepository.ts        # Admin users
│   └── customer/
│       └── CustomerRepository.ts    # Customers
├── kernel/
│   ├── BaseScript.ts
│   ├── Kernel.ts
│   └── types.ts
├── resolvers/
│   ├── admin/                       # Admin users resolvers
│   │   ├── interfaces/
│   │   │   └── index.ts
│   │   ├── UsersType.ts
│   │   ├── UserResolver.ts
│   │   └── UserConnectionResolver.ts
│   ├── customer/                    # Customer resolvers
│   │   ├── interfaces/
│   │   │   └── index.ts
│   │   ├── CustomersType.ts
│   │   ├── CustomerResolver.ts
│   │   └── CustomerConnectionResolver.ts
│   └── index.ts
├── scripts/
│   ├── index.ts
│   ├── user/                        # Admin users (CMS)
│   │   ├── dto/
│   │   │   ├── index.ts
│   │   │   ├── shared.ts
│   │   │   ├── UserCreateDto.ts
│   │   │   ├── UserUpdateDto.ts
│   │   │   └── UserDeleteDto.ts
│   │   ├── index.ts
│   │   ├── UserCreateScript.ts
│   │   ├── UserUpdateScript.ts
│   │   └── UserDeleteScript.ts
│   ├── customer/                    # Customers (storefront)
│   │   ├── dto/
│   │   ├── index.ts
│   │   ├── CustomerCreateScript.ts
│   │   ├── CustomerUpdateScript.ts
│   │   └── CustomerDeleteScript.ts
│   └── auth/
│       ├── dto/
│       │   ├── index.ts
│       │   ├── SignUpDto.ts
│       │   ├── SignInDto.ts
│       │   ├── SignOutDto.ts
│       │   ├── PasswordResetRequestDto.ts
│       │   ├── PasswordResetDto.ts
│       │   ├── PasswordChangeDto.ts
│       │   ├── ProfileUpdateDto.ts
│       │   └── EmailVerifyDto.ts
│       ├── index.ts
│       ├── SignUpScript.ts              # регистрация
│       ├── SignInScript.ts              # вход
│       ├── SignOutScript.ts             # выход
│       ├── PasswordResetRequestScript.ts # запрос сброса пароля (отправка email)
│       ├── PasswordResetScript.ts       # сброс пароля по коду
│       ├── PasswordChangeScript.ts      # смена пароля (текущий + новый)
│       ├── ProfileUpdateScript.ts       # изменение профиля
│       └── EmailVerifyScript.ts         # подтверждение email
├── users.module.ts
└── users.nest-service.ts
```

## Соответствие inventory → users

| inventory | users |
|-----------|-------|
| repositories/Repository.ts | repositories/Repository.ts |
| repositories/product/ProductRepository.ts | repositories/user/UserRepository.ts |
| resolvers/admin/interfaces/ | resolvers/admin/interfaces/ |
| kernel/types.ts → InventoryKernelServices | kernel/types.ts → UsersKernelServices |
| InventoryType.ts | UsersType.ts |

**Примечание:** Типы User, Role, Permission берутся из `@shopana/casdoor-node-sdk` (types.ts). Repository работает с casdoor клиентом вместо БД.

## Удаляемые файлы

- `src/repositories/models/` — drizzle схемы (заменяются на типы из SDK)
- `src/infrastructure/db/` — не нужна (нет своей БД)
- `drizzle.config.ts` — не нужен

## TODO

- [ ] Create resolvers/admin/interfaces/ (доменные интерфейсы, типы из SDK)
- [ ] Create repositories/Repository.ts (с casdoor клиентом)
- [ ] Create repositories/user/UserRepository.ts (admin users)
- [ ] Create repositories/customer/CustomerRepository.ts (customers)
- [ ] Update kernel/ (Kernel, BaseScript, types)
- [ ] Update scripts/user/ (admin users)
- [ ] Create scripts/customer/ (customers)
- [ ] Create scripts/auth/ (signUp, signIn, signOut, password reset/change, profile, email verify)
- [ ] Update context/types.ts
- [ ] Update resolvers/
- [ ] Update api/graphql-admin/ (user.graphql + customer.graphql)
- [ ] Update users.nest-service.ts
- [ ] Remove old DB code, drizzle.config.ts
