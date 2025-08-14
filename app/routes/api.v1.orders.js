import { ShopifySession } from "../models/ShopifySession";

const GET_CUSTOMER_ORDERS = `
query getCustomerOrders($customerId: ID!, $cursor: String) {
  customer(id: $customerId) {
    id
    firstName
    lastName
    email
    orders(first: 50, after: $cursor) {
      edges {
        node {
          id
          name
          createdAt
          cancelReason
          cancelledAt
          number
          returnStatus
          subtotalPriceSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
          totalPriceSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
          taxesIncluded
          totalTaxSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
          cancellation {
            staffNote
          }
          lineItems(first: 250) {
            edges {
              node {
                currentQuantity
                image {
                  url
                }
                name
                sku
                title
                vendor
                variantTitle
                originalUnitPriceSet {
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          returns(first: 10) {
            edges {
              node {
                id
                name
                status
                createdAt
                closedAt
                returnLineItems(first: 10) {
                  edges {
                    node {
                      ... on ReturnLineItem {
                        quantity
                        returnReason
                        returnReasonNote
                        fulfillmentLineItem {
                          lineItem {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          refunds(first: 10) {
            id
            createdAt
            note
            totalRefundedSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`;

export async function loader() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  try {
    const [session] = await ShopifySession.find();
    const { customerId } = await request.json();

    if (!customerId) {
      return new Response(
        JSON.stringify({ success: false, error: "customerId is required" }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let allOrders = [];
    let cursor = null;
    let hasNextPage = true;

    const shopifyEndpoint = `https://${session.shop}/admin/api/2025-07/graphql.json`;

    while (hasNextPage) {
      const response = await fetch(shopifyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session?.accessToken,
        },
        body: JSON.stringify({
          query: GET_CUSTOMER_ORDERS,
          variables: { customerId, cursor },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        return new Response(
          JSON.stringify({ success: false, error: data.errors }),
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const ordersData = data?.data?.customer?.orders;
      if (!ordersData) break;

      allOrders.push(...ordersData.edges.map(edge => edge.node));

      hasNextPage = ordersData.pageInfo.hasNextPage;
      cursor = ordersData.pageInfo.endCursor;
    }

    // ✅ Sort so latest orders come first
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return new Response(JSON.stringify({ 
      success: true,
      totalOrders: allOrders.length,
      orders: allOrders
    }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
};
