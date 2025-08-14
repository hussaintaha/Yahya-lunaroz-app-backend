export const CUSTOMER_CREATE = `mutation customerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer {
      id
      firstName
      lastName
      defaultEmailAddress {
        emailAddress
      }
      defaultPhoneNumber {
        phoneNumber
      }
    }
    userErrors {
      field
      message
    }
  }
}`


export const ORDER_CANCEL = `
mutation OrderCancel($orderId: ID!, $refund: Boolean!, $restock: Boolean!, $reason: OrderCancelReason!, $notifyCustomer: Boolean, $staffNote: String) {
  orderCancel(
    orderId: $orderId
    refund: $refund
    restock: $restock
    reason: $reason
    notifyCustomer: $notifyCustomer
    staffNote: $staffNote
  ) {
    job {
      id
      done
    }
    orderCancelUserErrors {
      field
      message
      code
    }
  }
}`;

export const CREATE_RETURN = `
mutation CreateReturn($returnInput: ReturnInput!) {
  returnCreate(returnInput: $returnInput) {
    userErrors {
      field
      message
    }
    return {
      id
      status
      returnLineItems(first: 10) {
        edges {
          node {
            ... on ReturnLineItem {
              fulfillmentLineItem {
                lineItem {
                  title
                  sku
                }
              }
              quantity
              returnReason
              returnReasonNote
            }
          }
        }
      }
      order {
        id
        name
      }
    }
  }
}
`;

export const GET_RETURNABLE_ITEMS = `
query GetReturnableFulfillmentLineItems($orderId: ID!) {
  returnableFulfillments(orderId: $orderId, first: 10) {
    edges {
      node {
        id
        returnableFulfillmentLineItems(first: 20) {
          edges {
            node {
              fulfillmentLineItem {
                id
                lineItem {
                  id
                  title
                  variant {
                    id
                    title
                    sku
                  }
                }
              }
              quantity
            }
          }
        }
      }
    }
  }
}`;
