export const FULFILLMENT_BOARD_QUERY = `
  query FulfillmentBoard($first: Int, $after: String, $last: Int, $before: String, $where: FulfillmentTicketWhereInput, $orderBy: [FulfillmentTicketOrderByInput!], $ticketsFirst: Int!) {
    fulfillmentQuery {
      stages(first: $first, after: $after, last: $last, before: $before) {
        edges { cursor node { id version title handle sortIndex createdAt updatedAt tickets(first: $ticketsFirst, where: $where, orderBy: $orderBy) { totalCount pageInfo { startCursor endCursor hasNextPage hasPreviousPage } } } }
        totalCount pageInfo { startCursor endCursor hasNextPage hasPreviousPage }
      }
    }
  }
`;
