import { gql } from "@apollo/client";
import { ORDER_DETAILS_FIELDS, ORDER_LIST_FIELDS, PAGE_INFO_FIELDS } from "./fragments";
export const ORDERS_QUERY = gql`query Orders($first: Int, $after: String, $last: Int, $before: String, $where: OrderWhereInput, $orderBy: [OrderOrderByInput!]) { ordersQuery { orders(first: $first, after: $after, last: $last, before: $before, where: $where, orderBy: $orderBy) { edges { cursor node { ...OrderListFields } } pageInfo { ...PageInfoFields } totalCount } } } ${ORDER_LIST_FIELDS} ${PAGE_INFO_FIELDS}`;
export const ORDER_QUERY = gql`query Order($id: ID!) { ordersQuery { order(id: $id) { ...OrderDetailsFields } } } ${ORDER_DETAILS_FIELDS}`;
